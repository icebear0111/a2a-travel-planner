import OpenAI from 'openai';
import { Intent, UserInput } from './intent';
import { DOMESTIC_DESTINATIONS } from '@/constants/destinations';

export interface FlightContext {
  /** 목적지까지 이동수단 (해외는 항상 flight) */
  mode: 'flight' | 'train' | 'bus' | 'car';
  departureTime: string;
  returnTime: string;
  price: number;
  /** 출발지 라벨 — 공항 코드, 기차역 이름, 또는 출발 도시 */
  originAirportCode: string;
  /** 도착지 라벨 — 공항 코드, 기차역 이름, 또는 목적지 */
  destAirportCode: string;
  /** 운송 수단 라벨 — 항공사, 열차명, '자차·렌터카' */
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

// 테이블에 없는 국내 여행지(예: 평창)는 AI로 이동시간·비용·출발지를 추정한다
const DOMESTIC_ESTIMATE_PROMPTS: Record<
  'flight' | 'train' | 'bus' | 'car',
  { desc: string; labels?: string; defaultOrigin: string }
> = {
  flight: {
    desc: '국내선 항공 (목적지에 공항이 없으면 가장 가까운 공항 기준)',
    labels: ',"originLabel":"출발 공항 이름(코드)","destLabel":"목적지에서 가장 가까운 공항 이름(코드)"',
    defaultOrigin: '김포(GMP)',
  },
  train: {
    desc: '기차 (KTX 우선, 가장 가까운 역 기준)',
    labels: ',"originLabel":"출발역","destLabel":"도착역"',
    defaultOrigin: '서울역',
  },
  bus: {
    desc: '고속·시외버스 (가장 가까운 터미널 기준)',
    labels: ',"originLabel":"출발 터미널","destLabel":"도착 터미널"',
    defaultOrigin: '서울고속버스터미널',
  },
  car: { desc: '자동차', defaultOrigin: '서울' },
};

async function estimateDomesticTransport(
  destination: string,
  mode: 'flight' | 'train' | 'bus' | 'car'
): Promise<{ duration: string; price: number; originLabel: string; destLabel: string } | null> {
  const promptInfo = DOMESTIC_ESTIMATE_PROMPTS[mode];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      reasoning_effort: 'none',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `한국 국내 이동 정보 전문가입니다. 서울에서 목적지까지의 ${promptInfo.desc} 이동 정보를 현실적으로 추정하세요.

## 출력 (JSON)
{"duration":"Xh Ym 형식 편도 소요시간","price":왕복 비용 KRW 숫자${promptInfo.labels || ''}}`,
        },
        { role: 'user', content: `서울 → ${destination}` },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) return null;
    const data = JSON.parse(content);
    if (!data.duration || !Number.isFinite(Number(data.price))) return null;

    return {
      duration: data.duration,
      price: Number(data.price),
      originLabel: data.originLabel || promptInfo.defaultOrigin,
      destLabel: data.destLabel || destination,
    };
  } catch (error) {
    console.error('❌ [2-Flight] 국내 이동 추정 실패:', error);
    return null;
  }
}

// 국내여행: 목적지 테이블 기반으로 항공/기차/자차 교통편을 구성하고,
// 테이블에 없는 여행지는 AI 추정으로 보완한다.
async function buildDomesticTransport(intent: Intent, input: UserInput): Promise<FlightContext> {
  const info = DOMESTIC_DESTINATIONS[intent.destination];
  const mode = intent.travelMode || 'car';
  const departureTime = input.flight.departureTime || '09:00';
  const returnTime = input.flight.returnTime || '18:00';
  const userPrice = input.flight.price;

  if (mode === 'flight') {
    if (info?.flight) {
      console.log(`✅ [2-Flight] 국내선: ${info.flight.originCode} → ${info.flight.destCode}`);
      return {
        mode,
        departureTime,
        returnTime,
        price: userPrice || info.flight.price,
        originAirportCode: input.flight.originAirportCode || info.flight.originCode,
        destAirportCode: input.flight.destAirportCode || info.flight.destCode,
        airline: info.flight.airline,
        flightDuration: info.flight.duration,
      };
    }

    const estimated = await estimateDomesticTransport(intent.destination, 'flight');
    if (estimated) {
      console.log(
        `✅ [2-Flight] 국내선 (AI 추정): ${estimated.originLabel} → ${estimated.destLabel}`
      );
      return {
        mode,
        departureTime,
        returnTime,
        price: userPrice || estimated.price,
        originAirportCode: estimated.originLabel,
        destAirportCode: estimated.destLabel,
        airline: '국내선',
        flightDuration: estimated.duration,
      };
    }
  }

  if (mode === 'train') {
    if (info?.train) {
      console.log(`✅ [2-Flight] 기차: ${info.train.originStation} → ${info.train.destStation}`);
      return {
        mode,
        departureTime,
        returnTime,
        price: userPrice || info.train.price,
        originAirportCode: info.train.originStation,
        destAirportCode: info.train.destStation,
        airline: info.train.trainName,
        flightDuration: info.train.duration,
      };
    }

    const estimated = await estimateDomesticTransport(intent.destination, 'train');
    if (estimated) {
      console.log(`✅ [2-Flight] 기차 (AI 추정): ${estimated.originLabel} → ${estimated.destLabel}`);
      return {
        mode,
        departureTime,
        returnTime,
        price: userPrice || estimated.price,
        originAirportCode: estimated.originLabel,
        destAirportCode: estimated.destLabel,
        airline: '기차',
        flightDuration: estimated.duration,
      };
    }
  }

  if (mode === 'bus') {
    if (info?.bus) {
      console.log(`✅ [2-Flight] 버스: ${info.bus.originTerminal} → ${info.bus.destTerminal}`);
      return {
        mode,
        departureTime,
        returnTime,
        price: userPrice || info.bus.price,
        originAirportCode: info.bus.originTerminal,
        destAirportCode: info.bus.destTerminal,
        airline: '고속버스',
        flightDuration: info.bus.duration,
      };
    }

    const estimated = await estimateDomesticTransport(intent.destination, 'bus');
    if (estimated) {
      console.log(`✅ [2-Flight] 버스 (AI 추정): ${estimated.originLabel} → ${estimated.destLabel}`);
      return {
        mode,
        departureTime,
        returnTime,
        price: userPrice || estimated.price,
        originAirportCode: estimated.originLabel,
        destAirportCode: estimated.destLabel,
        airline: '고속버스',
        flightDuration: estimated.duration,
      };
    }
  }

  // 자차·렌터카 (또는 위 수단 구성 실패 시의 폴백)
  const knownDrive = info?.drive;
  const estimatedDrive = knownDrive
    ? null
    : await estimateDomesticTransport(intent.destination, 'car');
  console.log(
    `✅ [2-Flight] 자차·렌터카: 서울 → ${intent.destination}${estimatedDrive ? ' (AI 추정)' : ''}`
  );
  return {
    mode: 'car',
    departureTime,
    returnTime,
    price: userPrice || knownDrive?.cost || estimatedDrive?.price || 100000,
    originAirportCode: '서울',
    destAirportCode: intent.destination,
    airline: '자차·렌터카',
    flightDuration: knownDrive?.duration || estimatedDrive?.duration || '3h 00m',
  };
}

export async function determineFlightConstraints(
  intent: Intent,
  input: UserInput
): Promise<FlightContext> {
  console.log(`✈️ [2-Flight] ${intent.destination} 교통편 분석 중...`);

  // 국내여행은 로컬 테이블로 즉시 구성한다.
  if (intent.isDomestic) {
    return buildDomesticTransport(intent, input);
  }

  const userFlight = input.flight;
  const takeoffTime = userFlight.departureTime || '10:00';
  const returnTakeoffTime = userFlight.returnTime || '18:00';

  const knownRoute = FALLBACK_ROUTES[intent.destination];

  // 로컬에 있는 대표 노선은 사용자가 입력한 가격을 유지하며 AI 호출 없이 구성한다.
  if (knownRoute) {
    const route = knownRoute;
    console.log(`✅ [2-Flight] 로컬 노선 정보 사용: ${userFlight.destAirportCode || route.code}`);

    return {
      mode: 'flight',
      departureTime: takeoffTime,
      returnTime: returnTakeoffTime,
      price: userFlight.price || route.price,
      originAirportCode: userFlight.originAirportCode || 'ICN',
      destAirportCode: userFlight.destAirportCode || route.code,
      airline: route.airline,
      flightDuration: route.duration,
    };
  }

  // 로컬에 없는 목적지만 AI로 노선 정보를 보완한다.
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      // 단순 정보 조회라 추론을 생략해 응답 속도를 우선한다.
      reasoning_effort: 'none',
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
      mode: 'flight',
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
      mode: 'flight',
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
