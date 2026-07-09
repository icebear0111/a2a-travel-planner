import type { UserInput } from '@/types/trip';

export const TRAVEL_STYLE_OPTIONS = [
  {
    id: 'budget',
    label: '저비용',
    description: '무료 명소, 현지 식당, 대중교통 중심',
    prompt: 'Keep costs low. Prefer free attractions, public transit, local casual restaurants, and avoid expensive tickets or shopping-heavy plans.',
  },
  {
    id: 'relaxed',
    label: '여유',
    description: '적은 장소, 넉넉한 이동, 늦은 시작',
    prompt: 'Create a relaxed itinerary with fewer stops, generous buffers, slower mornings, and no rushed late-night schedule.',
  },
  {
    id: 'packed',
    label: '알찬 일정',
    description: '핵심 명소를 촘촘하게, 하루를 길게 활용',
    prompt: 'Make each day fulfilling and active, adding more meaningful stops while keeping logistics realistic and geographically clustered.',
  },
  {
    id: 'food',
    label: '맛집 중심',
    description: '지역 음식, 카페, 시장을 우선 반영',
    prompt: 'Prioritize local food, cafes, markets, and restaurants. Structure days around meal locations and avoid generic tourist-only routes.',
  },
  {
    id: 'culture',
    label: '문화/역사',
    description: '박물관, 사찰, 오래된 거리, 로컬 이야기',
    prompt: 'Prioritize culture, history, museums, temples, traditional streets, and locally meaningful neighborhoods.',
  },
  {
    id: 'nature',
    label: '자연/힐링',
    description: '공원, 전망, 산책, 조용한 장소',
    prompt: 'Prioritize parks, waterfronts, viewpoints, scenic walks, and calm restorative places.',
  },
  {
    id: 'shopping',
    label: '쇼핑',
    description: '상권, 편집숍, 시장, 브랜드 매장',
    prompt: 'Prioritize shopping districts, local boutiques, markets, and flagship stores while keeping meal and transport flow sensible.',
  },
] as const;

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

  return `
[USER TRAVEL CONCEPT]
- Selected concepts (apply all together): ${
    conceptOptions.length > 0
      ? conceptOptions.map((option) => `\n  - ${option.label}: ${option.prompt}`).join('')
      : 'Balanced general trip'
  }
`.trim();
}
