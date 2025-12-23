import OpenAI from 'openai';

// 1. 입력 데이터 규격
export interface FlightInput {
  originAirportCode: string;
  destAirportCode: string;
  price: number;
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
}

export interface HotelInput {
  id: string;
  name: string;
  price: number;
  checkIn: string;
  checkOut: string;
}

export interface UserInput {
  destination: string;
  flight: FlightInput;
  hotels: HotelInput[];
}

// 2. 출력 데이터 규격
export interface Intent {
  destination: string;
  startDate: string;
  duration: number;
  companion: string;
  budgetLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  themes: string[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeIntent(input: UserInput): Promise<Intent> {
  console.log(`🔍 [1-Intent] 사용자 의도 분석 중... 목적지: ${input.destination}`);

  // 1️⃣ [계산] 기간(Duration) 계산
  // 날짜가 미정("")일 경우를 대비해 기본값 설정
  let duration = 3; // 기본 3일
  let startDate = new Date().toISOString().split('T')[0]; // 오늘 날짜

  if (input.flight.departureDate && input.flight.returnDate) {
    // 날짜가 확정된 경우 정확히 계산
    startDate = input.flight.departureDate;
    const start = new Date(input.flight.departureDate);
    const end = new Date(input.flight.returnDate);

    const timeDiff = end.getTime() - start.getTime();
    duration = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1);
  } else {
    console.log('⚠️ [1-Intent] 날짜 미정: 기본 기간 3일로 설정하여 분석합니다.');
  }

  try {
    // 2️⃣ [AI] 목적지 및 '계절/맥락' 분석 -> 테마 추출
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano', // or 'gpt-5-nano'
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
            You are a travel intent analyzer.
            Analyze the user's destination and travel context.

            RULES:
            1. **destination**: Translate to **KOREAN** standard city name (e.g., Tokyo -> 도쿄).
            2. **companion**: Infer from context (default: "친구").
            3. **budgetLevel**: Infer from context (default: "MEDIUM").
            4. **themes**: Recommend 3 keywords based on destination AND Seasonality (e.g., Winter -> "온천", "크리스마스").
            
            CONTEXT:
            - Origin: ${input.flight.originAirportCode || 'Unknown'}
            - Destination Airport: ${input.flight.destAirportCode || 'Unknown'}

            REQUIRED JSON STRUCTURE:
            {
              "destination": "string",
              "companion": "string",
              "budgetLevel": "LOW" | "MEDIUM" | "HIGH",
              "themes": ["string"]
            }
          `,
        },
        {
          role: 'user',
          // 👇 [핵심] 변경된 변수명 적용 및 계절감 파악 유도
          content: `
            Destination: "${input.destination}"
            Travel Start Date: ${startDate} (Duration: ${duration} days)
          `,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');

    const aiResult = JSON.parse(content);
    console.log(`✅ [1-Intent] 분석 완료: ${aiResult.destination} (테마: ${aiResult.themes})`);

    // 3️⃣ [병합]
    return {
      destination: aiResult.destination || input.destination,
      startDate: startDate,
      duration: duration,
      companion: aiResult.companion || '친구',
      budgetLevel: aiResult.budgetLevel || 'MEDIUM',
      themes: aiResult.themes || ['맛집', '핫플'],
    };
  } catch (error) {
    console.error('❌ [1-Intent] Error:', error);
    // 에러 발생 시 안전한 기본값 반환
    return {
      destination: input.destination,
      startDate: startDate,
      duration: duration,
      companion: '친구',
      budgetLevel: 'MEDIUM',
      themes: ['여행'],
    };
  }
}
