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

export type RegenerationMode = 'balanced' | 'cheaper' | 'relaxed' | 'fuller';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 단일 날짜 일정 생성 (병렬 호출용)
// ============================================
export async function generateDayItinerary(
  dayNumber: number,
  totalDays: number,
  intent: Intent,
  flight: FlightContext,
  hotel: HotelContext,
  mustVisitPlaces?: string[],
  suggestion?: AgentSuggestion,
  mode: RegenerationMode = 'balanced',
  currentActivities?: Activity[]
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

  const modeInstructionMap: Record<RegenerationMode, string> = {
    balanced: 'Keep the day balanced, realistic, and close to the original trip preferences.',
    cheaper:
      'Reduce paid attractions, expensive restaurants, shopping, taxis, and optional ticket costs. Prefer free viewpoints, parks, markets, and public transit.',
    relaxed:
      'Make the day more relaxed. Reduce the number of stops, add generous travel buffers, and avoid late-night overload.',
    fuller:
      'Make the day more active without becoming unrealistic. Add one optional stop only when the route stays geographically clustered.',
  };

  const currentPlanInstruction = currentActivities?.length
    ? `
[CURRENT DAY PLAN TO IMPROVE]
${currentActivities
  .map(
    (activity) => `- ${activity.time} ${activity.title} (${activity.type}, ${activity.duration})`
  )
  .join('\n')}

Use this as context, but return a freshly optimized full-day itinerary for Day ${dayNumber}.`
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
            
${daySpecificInstructions}

${budgetAdjustmentInstruction}

[REGENERATION MODE]
${modeInstructionMap[mode]}

${stylePrompt}

${currentPlanInstruction}

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

Must-Visit Places (USER PRIORITY):
${
  mustVisitPlaces && mustVisitPlaces.length > 0
    ? mustVisitPlaces.map((p) => `- ${p}`).join('\n')
    : '- None specified'
}

            Instruction:
Create a well-structured Day ${dayNumber} itinerary. Cluster activities by location. Make it relaxed but fulfilling.
Follow the user travel concept above as the main planning rule.
${
  mustVisitPlaces && mustVisitPlaces.length > 0
    ? '**IMPORTANT**: Try to include the must-visit places in the itinerary. Distribute them across days naturally based on geographic clustering.'
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

export async function generateActivityReplacement(
  intent: Intent,
  flight: FlightContext,
  hotel: HotelContext,
  day: DayItinerary,
  targetActivity: Activity,
  mustVisitPlaces?: string[]
): Promise<Activity> {
  console.log(`🔁 [4-Route] Day ${day.day} 활동 대체 생성: ${targetActivity.title}`);
  const stylePrompt = formatTravelStyleForPrompt(intent);

  const response = await openai.chat.completions.create({
    model: 'gpt-5.4-mini',
    reasoning_effort: 'none',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `
You are an expert travel itinerary editor.
Replace exactly ONE activity while preserving the day's route flow, schedule rhythm, and travel realism.

[MANDATORY FORMAT]
1. Response strictly JSON.
2. LANGUAGE: Korean title and desc.
3. Return a single "activity" object only.
4. Keep the same time window and similar duration unless a small adjustment improves realism.
5. Do not return the same place as the target.
6. Prefer real, searchable places near the surrounding activities.
7. Types: 'transport', 'hotel', 'sightseeing', 'food', 'shopping', 'coffee', 'theme', 'etc'.
8. id must be "${targetActivity.id}" so the frontend can replace in place.

REQUIRED JSON STRUCTURE:
{
  "activity": {
    "id": "${targetActivity.id}",
    "time": "${targetActivity.time}",
    "duration": "${targetActivity.duration}",
    "type": "sightseeing",
    "title": "...",
    "location": "...",
    "desc": "핵심 키워드",
    "price": 0
  }
}
        `,
      },
      {
        role: 'user',
        content: `
Destination: ${intent.destination}
Day: ${day.day} of ${intent.duration}
Themes: ${intent.themes.join(', ')}
Companion: ${intent.companion}

Hotel Basecamp:
- ${hotel.name}
- ${hotel.address}

${stylePrompt}

Flight Constraints:
- Origin Departure: ${flight.departureTime}
- Return Departure: ${flight.returnTime}

Must-Visit Places:
${
  mustVisitPlaces && mustVisitPlaces.length > 0
    ? mustVisitPlaces.map((place) => `- ${place}`).join('\n')
    : '- None specified'
}

Current Day Plan:
${day.activities
  .map(
    (activity) =>
      `- ${activity.time} ${activity.title} (${activity.type}, ${activity.duration}, ${
        activity.location || intent.destination
      })`
  )
  .join('\n')}

Target Activity To Replace:
- ${targetActivity.time} ${targetActivity.title}
- Type: ${targetActivity.type}
- Location: ${targetActivity.location || intent.destination}
- Desc: ${targetActivity.desc}
- Price: ${targetActivity.price}

Instruction:
Suggest one better alternative that fits between the previous and next activities. Keep logistics coherent.
        `,
      },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error('No replacement activity generated');

  const result = JSON.parse(content);
  return {
    ...targetActivity,
    ...(result.activity || {}),
    id: targetActivity.id,
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
    const dayPromises: Promise<DayItinerary>[] = [];

    for (let day = 1; day <= intent.duration; day++) {
      dayPromises.push(
        generateDayItinerary(
          day,
          intent.duration,
          intent,
          flight,
          hotel,
          mustVisitPlaces,
          suggestion
        )
      );
    }

    const startTime = Date.now();
    const results = await Promise.all(dayPromises);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // 날짜순 정렬
    results.sort((a, b) => a.day - b.day);

    console.log(`✅ [4-Route] ${intent.destination} 일정 생성 완료! (${elapsed}s, 병렬 처리)`);

    return results;
  } catch (error) {
    console.error('❌ [4-Route] Error:', error);
    return [];
  }
}
