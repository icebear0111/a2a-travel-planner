import OpenAI from 'openai';
import { Intent, UserInput } from './intent';

export interface FlightContext {
  departureTime: string;
  returnTime: string;
  price: number;
  originAirportCode: string;
  destAirportCode: string;
  airline: string;
  flightDuration: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 폴백용 노선 정보 (AI 실패 시에만 사용)
// ============================================
const FALLBACK_ROUTES: Record<
  string,
  { duration: string; code: string; price: number; airline: string }
> = {
  도쿄: { duration: '2h 30m', code: 'NRT', price: 350000, airline: '대한항공' },
  오사카: { duration: '2h 00m', code: 'KIX', price: 280000, airline: '진에어' },
  교토: { duration: '2h 00m', code: 'KIX', price: 280000, airline: '피치항공' },
  후쿠오카: { duration: '1h 20m', code: 'FUK', price: 200000, airline: '제주항공' },
  삿포로: { duration: '2h 40m', code: 'CTS', price: 380000, airline: '대한항공' },
  방콕: { duration: '5h 30m', code: 'BKK', price: 450000, airline: '타이항공' },
  발리: { duration: '7h 00m', code: 'DPS', price: 600000, airline: '가루다인도네시아' },
  다낭: { duration: '4h 30m', code: 'DAD', price: 350000, airline: '베트남항공' },
  파리: { duration: '12h 00m', code: 'CDG', price: 1500000, airline: '에어프랑스' },
  런던: { duration: '11h 30m', code: 'LHR', price: 1400000, airline: '대한항공' },
};

const DEFAULT_FLIGHT = { duration: '3h 00m', code: 'NRT', price: 400000, airline: '대한항공' };

export async function determineFlightConstraints(
  intent: Intent,
  input: UserInput
): Promise<FlightContext> {
  console.log(`✈️ [2-Flight] ${intent.destination} 항공편 분석 중...`);

  const userFlight = input.flight;
  const takeoffTime = userFlight.departureTime || '10:00';
  const returnTakeoffTime = userFlight.returnTime || '18:00';

  // Case A: 사용자가 가격을 입력한 경우 (확정) - AI로 비행시간만 추정
  if (userFlight.price > 0) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `항공편 정보 분석가입니다. 비행시간과 항공사를 추정해주세요.

## 출력 (JSON)
{"flightDuration":"Xh Ym 형식","airline":"항공사명"}`,
          },
          {
            role: 'user',
            content: `${userFlight.originAirportCode || 'ICN'} → ${
              userFlight.destAirportCode || intent.destination
            }`,
          },
        ],
      });

      const content = response.choices[0].message.content;
      const data = content ? JSON.parse(content) : {};

      return {
        departureTime: takeoffTime,
        returnTime: returnTakeoffTime,
        price: userFlight.price,
        originAirportCode: userFlight.originAirportCode || 'ICN',
        destAirportCode: userFlight.destAirportCode || data.destAirportCode || 'NRT',
        airline: data.airline || '항공사',
        flightDuration: data.flightDuration || '2h 00m',
      };
    } catch {
      const fallback = FALLBACK_ROUTES[intent.destination] || DEFAULT_FLIGHT;
      return {
        departureTime: takeoffTime,
        returnTime: returnTakeoffTime,
        price: userFlight.price,
        originAirportCode: userFlight.originAirportCode || 'ICN',
        destAirportCode: userFlight.destAirportCode || fallback.code,
        airline: fallback.airline,
        flightDuration: fallback.duration,
      };
    }
  }

  // Case B: AI 전체 추정
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `당신은 항공편 분석 전문가입니다.

## 분석 항목
1. **destAirportCode**: 목적지 주요 국제공항 IATA 코드
2. **flightDuration**: 직항 기준 비행시간 (예: "2h 30m")
3. **price**: 왕복 이코노미 예상가 (KRW, 현실적인 가격)
4. **airline**: 해당 노선 대표 항공사

## 출력 (JSON)
{"flightDuration":"string","destAirportCode":"string","price":number,"airline":"string"}`,
        },
        {
          role: 'user',
          content: `출발: ${userFlight.originAirportCode || 'ICN'} (서울)
도착: ${intent.destination}
기간: ${intent.duration}일`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');
    const data = JSON.parse(content);

    console.log(
      `✅ [2-Flight] ${data.airline} ${data.destAirportCode}, ${
        data.flightDuration
      }, ${data.price?.toLocaleString()}원`
    );

    return {
      departureTime: takeoffTime,
      returnTime: returnTakeoffTime,
      price: data.price || 300000,
      originAirportCode: userFlight.originAirportCode || 'ICN',
      destAirportCode: userFlight.destAirportCode || data.destAirportCode || 'NRT',
      airline: data.airline || '항공사',
      flightDuration: data.flightDuration || '2h 00m',
    };
  } catch (error) {
    console.error('❌ [2-Flight] Error:', error);
    // 폴백: 로컬 데이터 사용
    const fallback = FALLBACK_ROUTES[intent.destination] || DEFAULT_FLIGHT;

    return {
      departureTime: takeoffTime,
      returnTime: returnTakeoffTime,
      price: fallback.price,
      originAirportCode: userFlight.originAirportCode || 'ICN',
      destAirportCode: userFlight.destAirportCode || fallback.code,
      airline: fallback.airline,
      flightDuration: fallback.duration,
    };
  }
}
