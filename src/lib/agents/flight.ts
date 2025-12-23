import OpenAI from 'openai';
import { Intent, UserInput } from './intent';

// ✨ tripStore의 FlightInput과 변수명 통일 (Context용으로 확장)
export interface FlightContext {
  departureTime: string; // 출발지 이륙 시간 (사용자 입력)
  returnTime: string; // 현지 이륙 시간 (사용자 입력)
  price: number;
  originAirportCode: string; // 출발 공항
  destAirportCode: string; // 도착 공항
  airline: string; // 항공사
  flightDuration: string; // 비행 소요 시간
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function determineFlightConstraints(
  intent: Intent,
  input: UserInput
): Promise<FlightContext> {
  console.log(`✈️ [2-Transport] ${intent.destination} 비행 상세 정보 정밀 분석 중...`);

  const userFlight = input.flight;

  // UI 입력값 매핑
  const takeoffTime = userFlight.departureTime || '10:00';
  const returnTakeoffTime = userFlight.returnTime || '18:00';

  // 🚀 Case A: 사용자 입력값 존재 (가격이 있으면 확정)
  if (userFlight.price > 0) {
    return {
      departureTime: takeoffTime,
      returnTime: returnTakeoffTime,
      price: userFlight.price,
      originAirportCode: userFlight.originAirportCode || 'ICN',
      destAirportCode: userFlight.destAirportCode || 'Dest',
      airline: userFlight.originAirportCode
        ? `Depart from ${userFlight.originAirportCode}`
        : 'User Selected',
      flightDuration: '2h 00m', // 확정된 정보가 없으므로 기본값
    };
  }

  // 🚀 Case B: AI 정밀 추정
  const contextHint = `
    - User Origin: ${userFlight.originAirportCode || 'Seoul (ICN)'}
    - User Destination Hint: ${userFlight.destAirportCode || 'Unknown'}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano', // 정교한 추론을 위해 4o 권장 (또는 gpt-5-nano)
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
            You are a **Senior IATA Flight Analyst** specialized in Asian travel routes.
            Your goal is to provide **highly realistic** flight data based on current real-world statistics.

            [CONTEXT]
            - Destination: ${intent.destination}
            ${contextHint}

            [ANALYSIS TASKS]
            1. **Determine Destination Airport (destAirportCode)**:
               - Identify the primary international airport code (IATA) for the destination.
               - Example: Tokyo -> NRT or HND, Osaka -> KIX, Paris -> CDG.
               
            2. **Calculate Flight Duration (flightDuration)**:
               - Estimate the average **Direct Flight** time from Origin (Seoul) to Destination.
               - Format: "Xh Ym" (e.g., "2h 30m", "11h 45m").
               - If direct flight is unavailable, calculate the fastest connection time.

            3. **Estimate Price (price)**:
               - Calculate a realistic **Round-Trip Economy** fare in KRW.
               - Logic:
                 - Short-haul (Japan, China): 200,000 ~ 400,000 KRW
                 - Medium-haul (SE Asia): 400,000 ~ 700,000 KRW
                 - Long-haul (Europe, USA): 1,200,000 ~ 2,000,000 KRW
               - Consider seasonality (Peak vs Off-peak).

            4. **Select Carrier (airline)**:
               - Select the most dominant carrier for this specific route.
               - For Short/Medium-haul: Consider LCCs (Jeju Air, T'way, Jin Air) or FSC (Korean Air, Asiana).
               - For Long-haul: Major FSCs (Korean Air, Asiana, Delta, Air France, etc.).

            [REQUIRED JSON FORMAT]
            {
              "flightDuration": "string",
              "destAirportCode": "string",
              "price": number,
              "airline": "string"
            }
          `,
        },
        {
          role: 'user',
          content: `Analyze flight details for a trip to "${intent.destination}" starting from "${
            userFlight.originAirportCode || 'ICN'
          }".`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');
    const data = JSON.parse(content);

    console.log(
      `✅ [2-Transport] 분석 완료: ${data.airline} (${data.destAirportCode}), 소요시간: ${data.flightDuration}, 예상비용: ${data.price}`
    );

    return {
      departureTime: takeoffTime,
      returnTime: returnTakeoffTime,
      price: data.price || 300000,
      originAirportCode: userFlight.originAirportCode || 'ICN',
      destAirportCode: userFlight.destAirportCode || data.destAirportCode || 'ICN',
      airline: data.airline || 'Korean Air',
      flightDuration: data.flightDuration || '2h 00m',
    };
  } catch (error) {
    console.error('❌ [2-Flight] Error:', error);
    // 에러 발생 시 안전한 기본값
    return {
      departureTime: takeoffTime,
      returnTime: returnTakeoffTime,
      price: 0,
      originAirportCode: 'ICN',
      destAirportCode: 'ICN',
      airline: 'Transport',
      flightDuration: '2h 00m',
    };
  }
}
