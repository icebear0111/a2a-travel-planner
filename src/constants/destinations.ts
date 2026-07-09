// ============================================
// 국내 여행지 데이터
// ============================================
// 국내 여행은 해외와 달리 항공 외에 KTX·자차 이동이 일반적이므로,
// 목적지별로 지원 가능한 이동수단과 서울 기준 소요시간·비용을 정의한다.

export type DomesticTravelMode = 'flight' | 'train' | 'bus' | 'car';

export interface DomesticDestinationInfo {
  /** 목적지 기본 테마 */
  themes: string[];
  /** 국내선 항공 (서울 출발 왕복 기준) */
  flight?: {
    originCode: string;
    destCode: string;
    duration: string;
    price: number;
    airline: string;
  };
  /** KTX 등 기차 (서울 출발 왕복 기준) */
  train?: {
    originStation: string;
    destStation: string;
    duration: string;
    price: number;
    trainName: string;
  };
  /** 고속·시외버스 (서울 출발 왕복 기준) */
  bus?: {
    originTerminal: string;
    destTerminal: string;
    duration: string;
    price: number;
  };
  /** 자차·렌터카 (서울 출발 편도 소요시간, 왕복 유류·통행료 추정) */
  drive?: {
    duration: string;
    cost: number;
  };
}

export const DOMESTIC_DESTINATIONS: Record<string, DomesticDestinationInfo> = {
  제주: {
    themes: ['자연', '맛집', '드라이브'],
    flight: {
      originCode: 'GMP',
      destCode: 'CJU',
      duration: '1h 10m',
      price: 100000,
      airline: '제주항공',
    },
  },
  부산: {
    themes: ['맛집', '바다', '핫플'],
    flight: {
      originCode: 'GMP',
      destCode: 'PUS',
      duration: '1h 00m',
      price: 120000,
      airline: '대한항공',
    },
    train: {
      originStation: '서울역',
      destStation: '부산역',
      duration: '2h 45m',
      price: 119600,
      trainName: 'KTX',
    },
    bus: {
      originTerminal: '서울고속버스터미널',
      destTerminal: '부산종합버스터미널',
      duration: '4h 15m',
      price: 74000,
    },
    drive: { duration: '4h 30m', cost: 130000 },
  },
  강릉: {
    themes: ['바다', '카페', '자연'],
    train: {
      originStation: '서울역',
      destStation: '강릉역',
      duration: '1h 55m',
      price: 55200,
      trainName: 'KTX',
    },
    bus: {
      originTerminal: '서울고속버스터미널',
      destTerminal: '강릉고속버스터미널',
      duration: '2h 40m',
      price: 40000,
    },
    drive: { duration: '2h 40m', cost: 80000 },
  },
  속초: {
    themes: ['바다', '맛집', '자연'],
    bus: {
      originTerminal: '동서울종합터미널',
      destTerminal: '속초고속버스터미널',
      duration: '2h 10m',
      price: 40000,
    },
    drive: { duration: '2h 30m', cost: 70000 },
  },
  경주: {
    themes: ['역사', '문화', '산책'],
    train: {
      originStation: '서울역',
      destStation: '신경주역',
      duration: '2h 10m',
      price: 99400,
      trainName: 'KTX',
    },
    bus: {
      originTerminal: '서울고속버스터미널',
      destTerminal: '경주고속버스터미널',
      duration: '3h 30m',
      price: 60000,
    },
    drive: { duration: '3h 50m', cost: 110000 },
  },
  전주: {
    themes: ['한옥', '맛집', '감성'],
    train: {
      originStation: '용산역',
      destStation: '전주역',
      duration: '1h 50m',
      price: 69200,
      trainName: 'KTX',
    },
    bus: {
      originTerminal: '서울고속버스터미널',
      destTerminal: '전주고속버스터미널',
      duration: '2h 45m',
      price: 45000,
    },
    drive: { duration: '2h 50m', cost: 80000 },
  },
  여수: {
    themes: ['바다', '야경', '맛집'],
    train: {
      originStation: '용산역',
      destStation: '여수엑스포역',
      duration: '3h 00m',
      price: 94400,
      trainName: 'KTX',
    },
    bus: {
      originTerminal: '서울고속버스터미널',
      destTerminal: '여수종합버스터미널',
      duration: '4h 30m',
      price: 70000,
    },
    drive: { duration: '4h 20m', cost: 120000 },
  },
};

// 다양한 표기를 표준 이름으로 정규화
const DOMESTIC_ALIASES: Record<string, string> = {
  제주도: '제주',
  제주시: '제주',
  jeju: '제주',
  부산광역시: '부산',
  busan: '부산',
  강릉시: '강릉',
  gangneung: '강릉',
  속초시: '속초',
  sokcho: '속초',
  경주시: '경주',
  gyeongju: '경주',
  전주시: '전주',
  jeonju: '전주',
  여수시: '여수',
  yeosu: '여수',
};

/** 국내 여행지면 표준 이름과 정보를, 아니면 null을 반환 */
export function getDomesticDestination(
  rawDestination: string
): { name: string; info: DomesticDestinationInfo } | null {
  const trimmed = rawDestination.trim();
  const name = DOMESTIC_DESTINATIONS[trimmed]
    ? trimmed
    : DOMESTIC_ALIASES[trimmed.toLowerCase()] || null;

  if (!name || !DOMESTIC_DESTINATIONS[name]) return null;
  return { name, info: DOMESTIC_DESTINATIONS[name] };
}

/** 목적지가 지원하는 이동수단 중 기본값 (항공 > 기차 > 버스 > 자차 순) */
export function getDefaultTravelMode(info: DomesticDestinationInfo): DomesticTravelMode {
  if (info.flight) return 'flight';
  if (info.train) return 'train';
  if (info.bus) return 'bus';
  return 'car';
}

/** 목적지가 해당 이동수단을 지원하는지 */
export function supportsTravelMode(
  info: DomesticDestinationInfo,
  mode: DomesticTravelMode
): boolean {
  if (mode === 'flight') return Boolean(info.flight);
  if (mode === 'train') return Boolean(info.train);
  if (mode === 'bus') return Boolean(info.bus);
  return Boolean(info.drive);
}
