// 공항 코드 타입
export interface Airport {
  code: string;
  name: string;
}

// 출발지 공항 목록 (한국)
export const ORIGIN_AIRPORTS: Airport[] = [
  { code: 'ICN', name: '인천 (ICN)' },
  { code: 'GMP', name: '김포 (GMP)' },
  { code: 'PUS', name: '김해/부산 (PUS)' },
  { code: 'CJU', name: '제주 (CJU)' },
  { code: 'TAE', name: '대구 (TAE)' },
  { code: 'CJJ', name: '청주 (CJJ)' },
  { code: 'MWX', name: '무안 (MWX)' },
];

// 도착지 공항 목록 (국내 + 해외)
export const ARRIVAL_AIRPORTS: Airport[] = [
  // 국내
  { code: 'ICN', name: '인천 (ICN)' },
  { code: 'GMP', name: '김포 (GMP)' },
  { code: 'PUS', name: '김해/부산 (PUS)' },
  { code: 'CJU', name: '제주 (CJU)' },
  // 일본
  { code: 'NRT', name: '도쿄/나리타 (NRT)' },
  { code: 'HND', name: '도쿄/하네다 (HND)' },
  { code: 'KIX', name: '오사카/간사이 (KIX)' },
  { code: 'FUK', name: '후쿠오카 (FUK)' },
  { code: 'CTS', name: '삿포로 (CTS)' },
  // 아시아
  { code: 'TPE', name: '타이베이 (TPE)' },
  { code: 'DAD', name: '다낭 (DAD)' },
  { code: 'BKK', name: '방콕 (BKK)' },
  { code: 'SIN', name: '싱가포르 (SIN)' },
  // 유럽/미주
  { code: 'CDG', name: '파리 (CDG)' },
  { code: 'LHR', name: '런던 (LHR)' },
  { code: 'JFK', name: '뉴욕 (JFK)' },
  { code: 'LAX', name: '로스앤젤레스 (LAX)' },
];

