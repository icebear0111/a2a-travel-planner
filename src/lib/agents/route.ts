import OpenAI from 'openai';
import { Intent } from './intent';
import { FlightContext } from './flight';
import { HotelContext } from './hotel';
import { BUDGET_LIMITS } from './budget';
import { DRIVE_TRIP_PROMPT, formatTravelStyleForPrompt } from '@/lib/utils/travelStyle';

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

// 해당 일차의 실제 달력 날짜·요일을 구한다 — 요일(휴관일·혼잡도)과 계절을 프롬프트에 반영하기 위함.
// startDate("YYYY-MM-DD")는 UTC 자정으로 파싱되므로 요일도 UTC 기준으로 읽어야 서버 타임존과 무관하게 정확하다.
function resolveDayDate(startDate: string, dayNumber: number) {
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + (dayNumber - 1));

  const month = date.getUTCMonth() + 1;
  const season = month >= 3 && month <= 5 ? '봄' : month >= 6 && month <= 8 ? '여름' : month >= 9 && month <= 11 ? '가을' : '겨울';
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'UTC' });

  return { label: `${date.toISOString().split('T')[0]} (${weekday})`, season, weekday };
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

// 여러 날에 같은 관광지가 반복 편성되면 첫 등장만 남긴다
const CROSS_DAY_DEDUPE_TYPES = new Set(['sightseeing', 'theme']);
// 포함 관계 매칭 시 짧은 키("공원 산책" 등)의 오탐을 막기 위한 최소 길이
const MIN_CONTAINMENT_KEY_LENGTH = 6;

export function dedupeRepeatedPlaces(itinerary: DayItinerary[]): DayItinerary[] {
  const seenPlaceKeys = new Set<string>();

  const isDuplicate = (key: string) => {
    if (seenPlaceKeys.has(key)) return true;
    // "월정사 전나무숲길 산책" vs "오대산 월정사 전나무숲길 산책"처럼
    // 표현만 다른 같은 장소를 포함 관계로 잡는다.
    for (const seen of seenPlaceKeys) {
      const shorterLength = Math.min(seen.length, key.length);
      if (shorterLength < MIN_CONTAINMENT_KEY_LENGTH) continue;
      if (seen.includes(key) || key.includes(seen)) return true;
    }
    return false;
  };

  return itinerary.map((day) => ({
    ...day,
    activities: day.activities.filter((activity) => {
      if (!CROSS_DAY_DEDUPE_TYPES.has(activity.type)) return true;

      const key = normalizePlaceKey(activity.title);
      if (!key) return true;
      if (isDuplicate(key)) return false;
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
  const dayDate = resolveDayDate(intent.startDate, dayNumber);
  const dailyActivityBudget = (BUDGET_LIMITS[intent.budgetLevel] || BUDGET_LIMITS.MEDIUM)
    .activityPerDay;

  const travelMode = flight.mode || 'flight';
  const isDomestic = Boolean(intent.isDomestic);
  // 항공·기차·버스로 이동하면서 현지에서 렌터카를 쓰는 경우
  const needsRentalCar = Boolean(intent.useRentalCar) && travelMode !== 'car';
  // 자차든 렌터카든, 현지 이동이 차량 중심인 여행
  const isDriveTrip = travelMode === 'car' || needsRentalCar;
  const driveInstruction = isDriveTrip
    ? `

[DRIVING TRIP]
- ${DRIVE_TRIP_PROMPT}`
    : '';
  const rentalPickupInstruction = needsRentalCar
    ? `
            - **After arrival, add a RENTAL CAR PICKUP activity.** Type: 'transport', Duration: 30m, Title: "렌터카 픽업".`
    : '';
  const rentalReturnInstruction = needsRentalCar
    ? `
- **Add a "렌터카 반납" activity (Type: 'transport', 30m) before the final departure.**`
    : '';

  // 날짜별 특수 지시사항
  let daySpecificInstructions = '';

  if (isFirstDay) {
    if (travelMode === 'car') {
      daySpecificInstructions = `
            [CRITICAL - DAY 1 LOGISTICS (ROAD TRIP START)]
            - **Activity #1 MUST be the DRIVE to ${intent.destination}.**
              - Time: ${flight.departureTime} (User Input)
              - Duration: ${flight.flightDuration} (rest stop included)
              - Type: 'transport'
              - Title: "자차 출발: ${flight.originAirportCode} → ${intent.destination}"
              - Desc: "휴게소 1회, 약 ${flight.flightDuration}"
            - **NO airport, NO flight, NO immigration activities — this is a domestic road trip.**
            - After arriving, CHECK-IN at "${hotel.name}" (Type: 'hotel') when time allows
              (or one light stop near the hotel first, then check-in).
            - Then schedule light activities near the hotel.`;
    } else if (travelMode === 'train' || travelMode === 'bus') {
      daySpecificInstructions = `
            [CRITICAL - DAY 1 LOGISTICS (${travelMode === 'train' ? 'TRAIN' : 'BUS'} TRIP START)]
            - **Activity #1 MUST be the ${travelMode === 'train' ? 'TRAIN' : 'BUS'} RIDE.**
              - Time: ${flight.departureTime} (User Input)
              - Duration: ${flight.flightDuration}
              - Type: 'transport'
              - Title: "${flight.airline} 탑승: ${flight.originAirportCode} → ${flight.destAirportCode}"
            - **NO airport, NO flight, NO immigration activities.**${rentalPickupInstruction}
            - **Then MOVE TO HOTEL "${hotel.name}"** (Type: 'transport') **and CHECK-IN** (Type: 'hotel').
            - After check-in, schedule light activities near the hotel.`;
    } else if (isDomestic) {
      daySpecificInstructions = `
            [CRITICAL - DAY 1 LOGISTICS (DOMESTIC FLIGHT START)]
            - **Activity #1 MUST be the DOMESTIC FLIGHT.**
              - Time: ${flight.departureTime} (User Input)
              - Duration: ${flight.flightDuration}
              - Type: 'flight'
              - Title: "국내선 출발: ${intent.destination}행 (${flight.originAirportCode} → ${flight.destAirportCode})"
            - **Activity #2: 공항 도착 및 수하물 수령.** Duration: 30m ~ 40m (domestic flight — **NO immigration**).
              - Title: "${flight.destAirportCode} 공항 도착"${rentalPickupInstruction}
            - **Then MOVE TO HOTEL "${hotel.name}"** (Type: 'transport') **and CHECK-IN** (Type: 'hotel').
            - After check-in, schedule light activities near the hotel (considering arrival fatigue).`;
    } else {
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
    }
  } else if (isLastDay) {
    if (travelMode === 'car') {
      daySpecificInstructions = `
            [CRITICAL - LAST DAY LOGISTICS (ROAD TRIP END)]
- **The traveler is ALREADY in ${intent.destination} (arrived on Day 1). NEVER include an inbound ${flight.originAirportCode} → ${intent.destination} drive today — the ONLY long drive today is the DRIVE HOME at the end.**
- Morning: Hotel checkout (luggage goes in the car).
- Schedule light activities on the way, then head home.
            - **Final Activity MUST be the DRIVE HOME.**
              - Time: ${flight.returnTime}
              - Type: 'transport'
  - Title: "귀가 출발: ${intent.destination} → ${flight.originAirportCode}"`;
    } else if (travelMode === 'train' || travelMode === 'bus') {
      const stationWord = travelMode === 'train' ? '역' : '터미널';
      daySpecificInstructions = `
            [CRITICAL - LAST DAY LOGISTICS (${travelMode === 'train' ? 'TRAIN' : 'BUS'} TRIP END)]
- **The traveler is ALREADY in ${intent.destination} (arrived on Day 1). NEVER include an inbound ${flight.originAirportCode} → ${flight.destAirportCode} leg today — the ONLY long-distance ride today is the RETURN trip at the end.**
- Morning: Hotel checkout or luggage storage.
- Schedule light activities near the ${stationWord} area.${rentalReturnInstruction}
- **Schedule "${stationWord}으로 이동" about 40 minutes before the departure time.**
            - **Final Activity MUST be the RETURN ${travelMode === 'train' ? 'TRAIN' : 'BUS'}.**
              - Time: ${flight.returnTime}
              - Type: 'transport'
  - Title: "${flight.airline} 귀경: ${flight.destAirportCode} → ${flight.originAirportCode}"`;
    } else if (isDomestic) {
      daySpecificInstructions = `
            [CRITICAL - LAST DAY LOGISTICS (DOMESTIC FLIGHT END)]
- **The traveler is ALREADY in ${intent.destination} (arrived on Day 1). NEVER include an inbound ${flight.originAirportCode} → ${flight.destAirportCode} flight today — the ONLY flight today is the RETURN flight at the end.**
- Morning: Hotel checkout or luggage storage.
- Schedule light activities near the airport or central area.${rentalReturnInstruction}
- **Schedule "Travel to Airport" 1 hour before the flight time (domestic — short check-in).**
            - **Final Activity MUST be the DOMESTIC FLIGHT HOME.**
              - Time: ${flight.returnTime}
              - Type: 'flight'
  - Title: "귀가: ${flight.destAirportCode} 국내선 출발"`;
    } else {
      daySpecificInstructions = `
            [CRITICAL - LAST DAY LOGISTICS]
- **The traveler is ALREADY in ${intent.destination}. The ONLY flight today is the RETURN flight at ${flight.returnTime}, and it MUST be the LAST activity of the day. NEVER place a flight at the start of the day and NEVER reuse the outbound time ${flight.departureTime}.**
- Morning: Hotel checkout or luggage storage.
- Schedule light activities near the airport or central area, ending in time for the airport transfer.
- **Schedule "공항으로 이동" (Type: 'transport') 2.5 hours before the return flight time.**
            - **Final Activity MUST be FLIGHT DEPARTURE from Destination.**
              - Time: ${flight.returnTime}
              - Type: 'flight'
  - Title: "귀국: 공항 출발 (${flight.destAirportCode})"`;
    }
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
You are a senior travel planner who designs realistic, on-the-ground daily itineraries that travelers can actually follow.
Create the itinerary for **Day ${dayNumber} of ${totalDays}** in ${intent.destination}.${
          dayDate
            ? `
This day is **${dayDate.label}**, in ${dayDate.season} season.`
            : ''
        }

[MANDATORY FORMAT]
1. Response strictly JSON (structure at the end).
2. LANGUAGE: **KOREAN** (Title & Desc).
3. Types: 'flight', 'transport', 'hotel', 'sightseeing', 'food', 'shopping', 'coffee', 'theme', 'etc'.
   Meals = 'food', cafes/desserts = 'coffee'. Pick the closest type.
4. **Price**: realistic per-person KRW as of 2026. Use 0 for free places. 'food' price = expected meal cost per person.
5. **Location**: Specific City or Area name for Google Maps search (국내: "속초, 강원도" / 해외: "Umeda, Osaka").
6. For the last plan of each day, when returning to the hotel, don't use the word "귀환". Use "호텔 이동: ${hotel.name}" instead.
7. **Desc**: ONE short Korean sentence — what makes this stop worth it plus one practical tip
   (대표 메뉴, 예약 필요 여부, 휴무 요일, 덜 붐비는 시간대, 야경 포인트 등). No generic filler.
8. **id format**: "d${dayNumber}-[sequence]" (e.g., "d${dayNumber}-1", "d${dayNumber}-2", ...)

[REALITY CHECK - VERY IMPORTANT]
- Only include REAL places that exist and are currently operating. NEVER invent a place name.
- Respect opening hours and closure days${dayDate ? ` for a ${dayDate.weekday} visit` : ''}
  (many museums/palaces close on Mondays, some markets close on specific weekdays — pick alternatives if closed).
- Times must be chronological with NO overlaps; durations realistic (major spot 1.5h~2h, meal 1h~1.5h)
  and leave sensible gaps for moving between places.${
    dayDate
      ? `
- Fit the ${dayDate.season} season: in summer avoid long midday outdoor walks, in winter keep outdoor stops short
  and prefer indoor alternatives; use seasonal highlights (벚꽃, 단풍, 눈 축제 등) when the timing matches.`
      : ''
  }
- Budget level is ${intent.budgetLevel}: keep the sum of today's activity/food/transport prices
  (excluding flight & hotel) around ${dailyActivityBudget.toLocaleString()} KRW or less.

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

${stylePrompt}${driveInstruction}

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
- Day: ${dayNumber} of ${totalDays}${dayDate ? ` — ${dayDate.label}` : ''}
            - Themes: ${intent.themes.join(', ')}
            - Travel Concept: ${intent.travelStyle?.join(', ') || 'balanced'}
            - Budget Level: ${intent.budgetLevel} (daily activity budget ≈ ${dailyActivityBudget.toLocaleString()} KRW)

            Basecamp (Hotel):
            - Name: ${hotel.name}
            - Location Hint: ${hotel.address}

            Transport Data (mode: ${travelMode}${isDomestic ? ', DOMESTIC trip within Korea' : ''}):
- Route: ${flight.originAirportCode} → ${flight.destAirportCode} (${flight.airline})
- Outbound Departure: ${flight.departureTime} / Return Departure: ${flight.returnTime}
            - Travel Duration: ${flight.flightDuration}
${needsRentalCar ? '- The traveler picks up a rental car on arrival and returns it before departure. Plan drive-based days.' : ''}

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
Create a well-structured Day ${dayNumber} itinerary. Cluster activities by location and keep every stop real and open on this weekday.
Follow the user travel concept above as the main planning rule — it decides the day's pace and what kinds of stops to prioritize.
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
