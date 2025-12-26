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

export async function generateItinerary(
  intent: Intent,
  flight: FlightContext,
  hotel: HotelContext,
  suggestion?: AgentSuggestion
): Promise<DayItinerary[]> {
  console.log(`🗺️ [4-Route] ${intent.destination} 정밀 일정 생성 시작...`);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
            You are an expert travel route optimizer focusing on a "Relaxed & Efficient" experience.
            Create a highly realistic, minute-by-minute itinerary.

            [MANDATORY FORMAT]
            1. Response strictly JSON.
            2. LANGUAGE: **KOREAN** (Title & Desc).
            3. Types: 'flight', 'transport', 'hotel', 'sightseeing', 'food', 'shopping', 'cafe', 'nightlife'.
            4. Price: Estimated KRW.
            5. **Location**: Specific City or Area name for Google Maps search (e.g., "Kyoto", "Umeda, Osaka").
            6. For the last plan of each day, when returning to the hotel, don't use the word "귀환". Use "호텔 이동: ${hotel.name}" instead.
            7. For each desc only use keywords.

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

            [CRITICAL - LAST DAY LOGISTICS]
            - **Final Activity MUST be FLIGHT DEPARTURE from Destination.**
              - Time: ${flight.returnTime}
              - Type: 'flight'
              - Title: "귀국: 공항 출발 (${flight.destAirportCode})"
            - Schedule "Travel to Airport" 2.5 hours before the flight time.

            [CRITICAL - GEOGRAPHIC CLUSTERING]
            - **ONE DAY = ONE AREA**: Minimize travel time. Do NOT zig-zag across the city.
            - **Basecamp Strategy**: User is staying at **"${hotel.name}"**. 
              - Morning: Start from Hotel.
              - Evening: Loop back towards the Hotel area.
            
            [CRITICAL - PACING & VIBE]
            - **Start**: Around 10:00 (Except Day 1).
            - **Lunch**: 12:30 ~ 13:30.
            - **Dinner**: 18:30 ~ 20:00.
            - **Night**: Suggest ONE activity after dinner before returning to hotel (~22:00). If tired, return to hotel directly.
            - Don't cram too many spots. Allow 1.5h per spot.

            REQUIRED JSON STRUCTURE:
            {
              "itinerary": [
                {
                  "day": 1,
                  "activities": [
                    {
                      "id": "uuid",
                      "time": "HH:MM",
                      "duration": "2h",
                      "type": "flight",
                      "title": "...",
                      "location": "...",
                      "desc": "...",
                      "price": 0
                    }
                  ]
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
            - Duration: ${intent.duration} days
            - Themes: ${intent.themes.join(', ')}
            - Companion: ${intent.companion}

            Basecamp (Hotel):
            - Name: ${hotel.name}
            - Location Hint: ${hotel.address}

            Transport Data:
            - Origin Departure: ${flight.departureTime} (Start of Day 1)
            - Flight Duration: ${flight.flightDuration}
            - Destination Departure: ${flight.returnTime} (End of Trip)
            - Hub: ${flight.destAirportCode}

            Instruction:
            Cluster activities by location. Make it relaxed.
            ${suggestion ? `IMPORTANT REVISION REQUEST: ${suggestion.reason}` : ''}
          `,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');

    const result = JSON.parse(content);
    console.log(`✅ [4-Route] ${intent.destination} 일정 생성 완료!`);

    return result.itinerary;
  } catch (error) {
    console.error('❌ [4-Route] Error:', error);
    return [];
  }
}
