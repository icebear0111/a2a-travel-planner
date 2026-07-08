import OpenAI from 'openai';
import { Intent } from './intent';
import { FlightContext } from './flight';
import { HotelContext } from './hotel';
import { formatTravelStyleForPrompt } from '@/lib/utils/travelStyle';

export interface AgentSuggestion {
  target: 'HOTEL' | 'ROUTE';
  reason: string;
}

export interface Activity {
  id: string;
  title: string;
  type: string;
  price: number;
  desc: string;
  duration: string;
  time: string;
  location: string;
  address?: string;
  placeId?: string;
  coordinate?: { lat: number; lng: number };
  isPlaceValidated?: boolean;
  travelTimeToNext?: string;
  travelDistanceToNext?: string;
  travelMinutesToNext?: number;
  travelMetersToNext?: number;
}

export interface DayItinerary {
  day: number;
  activities: Activity[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 꼭 가고 싶은 장소(must-visit)의 날짜 사전 배정
// ============================================
// 날짜별 일정이 병렬로 생성되어 서로의 내용을 모르기 때문에, 같은 장소가
// 여러 날에 중복 편성되는 문제가 있었다. 생성 전에 장소마다 담당 날짜를
// 확정해 "그 날에만 포함"하도록 강제한다.
export function assignMustVisitPlaces(
  mustVisitPlaces: string[] | undefined,
  totalDays: number
): Map<number, string[]> {
  const assignment = new Map<number, string[]>();
  const places = (mustVisitPlaces || []).map((place) => place.trim()).filter(Boolean);
  if (places.length === 0) return assignment;

  // 도착일(1일차)·출발일(마지막 날)은 이동으로 시간이 짧으므로 중간 날짜에 우선 배정한다.
  const middleDays = Array.from({ length: Math.max(0, totalDays - 2) }, (_, i) => i + 2);
  const candidateDays = middleDays.length > 0 ? middleDays : [1];

  places.forEach((place, index) => {
    const day = candidateDays[index % candidateDays.length];
    assignment.set(day, [...(assignment.get(day) || []), place]);
  });

  return assignment;
}

const normalizePlaceKey = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

const matchesPlace = (title: string, place: string) => {
  const normalizedTitle = normalizePlaceKey(title);
  const normalizedPlace = normalizePlaceKey(place);
  if (!normalizedTitle || !normalizedPlace) return false;
  return normalizedTitle.includes(normalizedPlace) || normalizedPlace.includes(normalizedTitle);
};

// 다른 날짜에 배정된 must-visit이 이 날짜에 끼어들면 제거한다 (프롬프트 무시 대비 안전망)
export function removeForeignMustVisits(
  day: DayItinerary,
  foreignPlaces: string[]
): DayItinerary {
  if (foreignPlaces.length === 0) return day;

  return {
    ...day,
    activities: day.activities.filter(
      (activity) => !foreignPlaces.some((place) => matchesPlace(activity.title, place))
    ),
  };
}

// 여러 날에 완전히 같은 관광지가 반복 편성되면 첫 등장만 남긴다
const CROSS_DAY_DEDUPE_TYPES = new Set(['sightseeing', 'theme']);

export function dedupeRepeatedPlaces(itinerary: DayItinerary[]): DayItinerary[] {
  const seenPlaceKeys = new Set<string>();

  return itinerary.map((day) => ({
    ...day,
    activities: day.activities.filter((activity) => {
      if (!CROSS_DAY_DEDUPE_TYPES.has(activity.type)) return true;

      const key = normalizePlaceKey(activity.title);
      if (!key) return true;
      if (seenPlaceKeys.has(key)) return false;
      seenPlaceKeys.add(key);
      return true;
    }),
  }));
}

// ============================================
// 단일 날짜 일정 생성 (병렬 호출용)
// ============================================
export async function generateDayItinerary(
  dayNumber: number,
  totalDays: number,
  intent: Intent,
  flight: FlightContext,
  hotel: HotelContext,
  assignedMustVisit?: string[],
  suggestion?: AgentSuggestion,
  otherDaysMustVisit?: string[]
): Promise<DayItinerary> {
  const isFirstDay = dayNumber === 1;
  const isLastDay = dayNumber === totalDays;
  const stylePrompt = formatTravelStyleForPrompt(intent);

  // 날짜별 특수 지시사항
  let daySpecificInstructions = '';

  if (isFirstDay) {
    daySpecificInstructions = `
            [CRITICAL - DAY 1 LOGISTICS (FLIGHT START)]
            - **Activity #1 MUST be the FLIGHT DEPARTURE from Origin.**
              - Time: ${flight.departureTime} (User Input)
              - Duration: ${flight.flightDuration}
              - Type: 'flight'
              - Title: "출국: ${intent.destination}행 비행기 탑승"
              - Desc: "출발: ${flight.originAirportCode}, 소요시간: ${flight.flightDuration}"
            
            - **Activity #2 MUST be ARRIVAL & IMMIGRATION.**
              - Time: Calculate based on (Start Time + Duration).
              - Duration: 1h ~ 1.5h (Immigration & Baggage Claim).
              - Title: "${intent.destination} 공항(${flight.destAirportCode}) 도착 및 입국 수속"
            
            - **Activity #3 MUST be MOVE TO HOTEL.**
              - Destination: ${hotel.name}
              - Type: 'transport'
            
            - **Activity #4 MUST be CHECK-IN.**
              - Type: 'hotel'
  - Title: "${hotel.name} 체크인"

- After check-in, schedule light activities near the hotel (considering arrival fatigue).`;
  } else if (isLastDay) {
    daySpecificInstructions = `
            [CRITICAL - LAST DAY LOGISTICS]
- Morning: Hotel checkout or luggage storage.
- Schedule light activities near the airport or central area.
- **Schedule "Travel to Airport" 2.5 hours before the flight time.**
            - **Final Activity MUST be FLIGHT DEPARTURE from Destination.**
              - Time: ${flight.returnTime}
              - Type: 'flight'
  - Title: "귀국: 공항 출발 (${flight.destAirportCode})"`;
  } else {
    daySpecificInstructions = `
[FULL DAY - MIDDLE DAY]
- **Start**: Around 10:00 from hotel.
- **Lunch**: 12:30 ~ 13:30.
- **Dinner**: 18:30 ~ 20:00.
- **Night**: Suggest ONE activity after dinner before returning to hotel (~22:00).
- Allow 1.5h ~ 2h per major spot. Don't cram too many spots.`;
  }

  const budgetAdjustmentInstruction =
    suggestion?.target === 'ROUTE'
      ? `
[BUDGET ADJUSTMENT REQUIRED]
- Reason: ${suggestion.reason}
- Prefer free or low-cost attractions, public transit, casual local restaurants, and fewer paid tickets.
- Keep must-visit places if possible, but reduce optional shopping/theme/nightlife costs.
- Prices must be realistic KRW estimates after the cost reduction.`
      : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    // 일정 생성은 추론보다 생성 위주 작업이라 추론을 생략해 지연시간을 최소화한다.
    // (gpt-5.4-mini 실측: low는 추론 토큰이 추가되어 오히려 2~3초 느려짐)
    reasoning_effort: 'none',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `
You are an expert travel route optimizer focusing on a "Relaxed & Efficient" experience.
Create a highly realistic, minute-by-minute itinerary for **Day ${dayNumber} of ${totalDays}**.

[MANDATORY FORMAT]
1. Response strictly JSON.
2. LANGUAGE: **KOREAN** (Title & Desc).
3. Types: 'flight', 'transport', 'hotel', 'sightseeing', 'food', 'shopping', 'coffee', 'theme', 'etc'.
4. Price: Estimated KRW.
5. **Location**: Specific City or Area name for Google Maps search (e.g., "Kyoto", "Umeda, Osaka").
6. For the last plan of each day, when returning to the hotel, don't use the word "귀환". Use "호텔 이동: ${hotel.name}" instead.
7. For each desc only use keywords.
8. **id format**: "d${dayNumber}-[sequence]" (e.g., "d${dayNumber}-1", "d${dayNumber}-2", ...)

            [CRITICAL - GEOGRAPHIC CLUSTERING]
            - **ONE DAY = ONE AREA**: Minimize travel time. Do NOT zig-zag across the city.
            - **Basecamp Strategy**: User is staying at **"${hotel.name}"**.
              - Morning: Start from Hotel.
              - Evening: Loop back towards the Hotel area.
            - **NO REPEATS ACROSS DAYS**: This is one day of a ${totalDays}-day trip planned in parallel.
              Never schedule an attraction reserved for another day (listed below), and pick spots
              distinctive to today's area so days don't overlap.
            
${daySpecificInstructions}

${budgetAdjustmentInstruction}

${stylePrompt}

            REQUIRED JSON STRUCTURE:
            {
                  "activities": [
                    {
      "id": "d${dayNumber}-1",
                      "time": "HH:MM",
                      "duration": "2h",
      "type": "sightseeing",
                      "title": "...",
                      "location": "...",
                      "desc": "...",
                      "price": 0
                }
              ]
            }
          `,
      },
      {
        role: 'user',
        content: `
            User Request Overview:
            - Destination: ${intent.destination}
- Day: ${dayNumber} of ${totalDays}
            - Themes: ${intent.themes.join(', ')}
            - Companion: ${intent.companion}
            - Travel Concept: ${intent.travelStyle || 'balanced'}

            Basecamp (Hotel):
            - Name: ${hotel.name}
            - Location Hint: ${hotel.address}

            Transport Data:
- Origin Airport: ${flight.originAirportCode}
- Destination Airport: ${flight.destAirportCode}
- Origin Departure: ${flight.departureTime}
            - Flight Duration: ${flight.flightDuration}
- Return Departure: ${flight.returnTime}

Must-Visit Places assigned to THIS DAY (USER PRIORITY):
${
  assignedMustVisit && assignedMustVisit.length > 0
    ? assignedMustVisit.map((p) => `- ${p}`).join('\n')
    : '- None'
}

Must-visit places reserved for OTHER days of this trip (STRICTLY FORBIDDEN today):
${
  otherDaysMustVisit && otherDaysMustVisit.length > 0
    ? otherDaysMustVisit.map((p) => `- ${p}`).join('\n')
    : '- None'
}

            Instruction:
Create a well-structured Day ${dayNumber} itinerary. Cluster activities by location. Make it relaxed but fulfilling.
Follow the user travel concept above as the main planning rule.
${
  assignedMustVisit && assignedMustVisit.length > 0
    ? '**IMPORTANT**: Today MUST include every place assigned to this day. Build the day\'s route around them and allocate enough time (a theme park deserves most of the day).'
    : ''
}
${
  otherDaysMustVisit && otherDaysMustVisit.length > 0
    ? '**NEVER** schedule the places reserved for other days — each must-visit place appears EXACTLY ONCE in the whole trip, on its assigned day only.'
    : ''
}
${
  suggestion?.target === 'ROUTE'
    ? '**BUDGET MODE**: Lower the total activity cost for this day while keeping the trip coherent.'
    : ''
}
          `,
      },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error(`No content for day ${dayNumber}`);

  const result = JSON.parse(content);

  return {
    day: dayNumber,
    activities: result.activities || [],
  };
}

// ============================================
// 메인 함수: 병렬로 모든 날짜 생성
// ============================================
export async function generateItinerary(
  intent: Intent,
  flight: FlightContext,
  hotel: HotelContext,
  suggestion?: AgentSuggestion,
  mustVisitPlaces?: string[]
): Promise<DayItinerary[]> {
  console.log(`🗺️ [4-Route] ${intent.destination} ${intent.duration}일 일정 병렬 생성 시작...`);

  if (suggestion) {
    console.log(`📝 [4-Route] 수정 요청: ${suggestion.reason}`);
  }

  if (mustVisitPlaces && mustVisitPlaces.length > 0) {
    console.log(`📍 [4-Route] 꼭 가고 싶은 장소: ${mustVisitPlaces.join(', ')}`);
  }

  try {
    // 중복 편성 방지: must-visit을 날짜별로 사전 배정한다.
    const mustVisitAssignment = assignMustVisitPlaces(mustVisitPlaces, intent.duration);
    const allAssignedPlaces = [...mustVisitAssignment.values()].flat();

    const dayPromises: Promise<DayItinerary>[] = [];

    for (let day = 1; day <= intent.duration; day++) {
      const assignedForDay = mustVisitAssignment.get(day) || [];
      const reservedForOtherDays = allAssignedPlaces.filter(
        (place) => !assignedForDay.includes(place)
      );

      dayPromises.push(
        generateDayItinerary(
          day,
          intent.duration,
          intent,
          flight,
          hotel,
          assignedForDay,
          suggestion,
          reservedForOtherDays
        ).then((result) => removeForeignMustVisits(result, reservedForOtherDays))
      );
    }

    const startTime = Date.now();
    const results = await Promise.all(dayPromises);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // 날짜순 정렬 후 날짜 간 관광지 중복 제거
    results.sort((a, b) => a.day - b.day);
    const deduped = dedupeRepeatedPlaces(results);

    console.log(`✅ [4-Route] ${intent.destination} 일정 생성 완료! (${elapsed}s, 병렬 처리)`);

    return deduped;
  } catch (error) {
    console.error('❌ [4-Route] Error:', error);
    return [];
  }
}
