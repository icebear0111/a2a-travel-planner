import type { UserInput } from '@/types/trip';

export const TRAVEL_STYLE_OPTIONS = [
  {
    id: 'budget',
    label: '저비용',
    description: '무료 명소, 현지 식당, 대중교통 중심',
    prompt:
      'Keep costs low: prefer free attractions, public transit, and local casual restaurants. At most ONE paid-entry ticket per day (must-visit places excepted).',
  },
  {
    id: 'relaxed',
    label: '여유',
    description: '적은 장소, 넉넉한 이동, 늦은 시작',
    prompt:
      'Relaxed pace: at most 3 major stops per day, first non-transport activity at 10:00 or later, generous buffers between stops, day ends by ~21:00.',
  },
  {
    id: 'packed',
    label: '알찬 일정',
    description: '핵심 명소를 촘촘하게, 하루를 길게 활용',
    prompt:
      'Packed pace: at least 5 meaningful stops per day, start by 09:30, use the evening too — but keep stops geographically clustered so the density stays realistic.',
  },
  {
    id: 'food',
    label: '맛집 중심',
    description: '지역 음식, 카페, 시장을 우선 반영',
    prompt:
      'Food-first: lunch and dinner MUST be at well-known named local restaurants, plus at least 2 extra food experiences per day (market, dessert, famous cafe, street food).',
  },
  {
    id: 'culture',
    label: '문화/역사',
    description: '박물관, 사찰, 오래된 거리, 로컬 이야기',
    prompt:
      'Culture-first: at least 2 culture/history stops per day (museum, palace, temple, historic street), each with enough time to actually explore.',
  },
  {
    id: 'nature',
    label: '자연/힐링',
    description: '공원, 전망, 산책, 조용한 장소',
    prompt:
      'Nature-first: at least 2 nature/scenery stops per day (park, coast, viewpoint, scenic walk), scheduled in comfortable daylight hours.',
  },
  {
    id: 'shopping',
    label: '쇼핑',
    description: '상권, 편집숍, 시장, 브랜드 매장',
    prompt:
      'Shopping-first: at least 2 shopping stops per day (district, market, local boutiques) with realistic browsing time.',
  },
] as const;

// 활동의 conceptTag 검증에 쓰는 "내용형" 컨셉 — 페이스형(여유/알찬/저비용)은
// 하루 전체에 적용되는 규칙이라 개별 활동에 태깅할 수 없다.
export const CONTENT_CONCEPT_IDS = ['food', 'culture', 'nature', 'shopping'] as const;

// 자차·렌터카로 이동하는 여행의 일정 생성 지시 (route 에이전트에서 사용)
export const DRIVE_TRIP_PROMPT =
  'The traveler moves by car (own or rental): transfers between stops are drive legs, a wider day-trip radius is fine (scenic drives, suburbs, viewpoints), prefer spots with parking, and avoid transit-hub-centric routing.';

const findOption = <T extends readonly { id: string; label: string; prompt: string }[]>(
  options: T,
  id?: string
) => options.find((option) => option.id === id);

export function getTravelStyleLabel(styleIds?: string[]) {
  const labels = (styleIds || [])
    .map((id) => findOption(TRAVEL_STYLE_OPTIONS, id)?.label)
    .filter((label): label is string => Boolean(label));

  return labels.length > 0 ? labels.join(' · ') : '균형 여행';
}

export function formatTravelStyleForPrompt(input: Pick<UserInput, 'travelStyle'>) {
  const conceptOptions = (input.travelStyle || [])
    .map((id) => findOption(TRAVEL_STYLE_OPTIONS, id))
    .filter((option): option is (typeof TRAVEL_STYLE_OPTIONS)[number] => Boolean(option));

  const ids = conceptOptions.map((option) => option.id as string);
  const hasPaceConflict = ids.includes('relaxed') && ids.includes('packed');

  return `
[USER TRAVEL CONCEPT — HARD REQUIREMENTS, not suggestions]
- Selected concepts (apply all together): ${
    conceptOptions.length > 0
      ? conceptOptions.map((option) => `\n  - ${option.label}: ${option.prompt}`).join('')
      : 'Balanced general trip'
  }${
    hasPaceConflict
      ? '\n- Pace conflict (여유+알찬): target 4 major stops with generous buffers.'
      : ''
  }
- On arrival/departure days, scale these quotas to the hours actually available.
`.trim();
}
