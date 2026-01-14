import OpenAI from 'openai';
import { Intent } from './intent';
import { FlightContext } from './flight';
import { HotelContext } from './hotel';

export interface AgentSuggestion {
  target: 'HOTEL' | 'ROUTE';
  reason: string;
}

interface Activity {
  id: string;
  title: string;
  type: string;
  price: number;
  desc: string;
  duration: string;
  time: string;
  location: string;
}

export interface DayItinerary {
  day: number;
  activities: Activity[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 단일 날짜 일정 생성 (병렬 호출용)
// ============================================
async function generateDayItinerary(
  dayNumber: number,
  totalDays: number,
  intent: Intent,
  flight: FlightContext,
  hotel: HotelContext,
  mustVisitPlaces?: string[]
): Promise<DayItinerary> {
  const isFirstDay = dayNumber === 1;
  const isLastDay = dayNumber === totalDays;

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

  const response = await openai.chat.completions.create({
    model: 'gpt-5-mini',
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
3. Types: 'flight', 'transport', 'hotel', 'sightseeing', 'food', 'shopping', 'cafe', 'nightlife', 'etc'.
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
${mustVisitPlaces && mustVisitPlaces.length > 0 ? mustVisitPlaces.map((p) => `- ${p}`).join('\n') : '- None specified'}

Instruction:
Create a well-structured Day ${dayNumber} itinerary. Cluster activities by location. Make it relaxed but fulfilling.
${mustVisitPlaces && mustVisitPlaces.length > 0 ? '**IMPORTANT**: Try to include the must-visit places in the itinerary. Distribute them across days naturally based on geographic clustering.' : ''}
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
    const dayPromises: Promise<DayItinerary>[] = [];

    for (let day = 1; day <= intent.duration; day++) {
      dayPromises.push(generateDayItinerary(day, intent.duration, intent, flight, hotel, mustVisitPlaces));
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
