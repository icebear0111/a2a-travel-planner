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

export const TRAVEL_PACE_OPTIONS = [
  { id: 'relaxed', label: '느긋하게', prompt: 'Use a slow pace with fewer stops and more rest.' },
  { id: 'balanced', label: '균형 있게', prompt: 'Use a balanced pace with realistic but satisfying days.' },
  { id: 'packed', label: '빽빽하게', prompt: 'Use an active pace with fuller days, but avoid impossible transfers.' },
] as const;

export const BUDGET_PREFERENCE_OPTIONS = [
  { id: 'budget', label: '아끼기', prompt: 'Keep activity, food, and transport costs low.' },
  { id: 'balanced', label: '적당히', prompt: 'Balance value and experience quality.' },
  { id: 'premium', label: '경험 우선', prompt: 'Allow premium experiences when they are memorable and worth the cost.' },
] as const;

export const TRANSPORT_PREFERENCE_OPTIONS = [
  { id: 'public', label: '대중교통', prompt: 'Prefer public transit and walkable clusters.' },
  { id: 'walk-light', label: '도보 적게', prompt: 'Reduce walking distance and avoid hard transfers.' },
  { id: 'flexible', label: '상관없음', prompt: 'Choose the most efficient realistic transport mode.' },
] as const;

const findOption = <T extends readonly { id: string; label: string; prompt: string }[]>(
  options: T,
  id?: string
) => options.find((option) => option.id === id);

export function getTravelStyleLabel(styleId?: string) {
  return findOption(TRAVEL_STYLE_OPTIONS, styleId)?.label || '균형 여행';
}

export function formatTravelStyleForPrompt(input: Pick<
  UserInput,
  'travelStyle' | 'travelKeywords' | 'pace' | 'budgetPreference' | 'transportPreference'
>) {
  const mainStyle = findOption(TRAVEL_STYLE_OPTIONS, input.travelStyle);
  const pace = findOption(TRAVEL_PACE_OPTIONS, input.pace);
  const budget = findOption(BUDGET_PREFERENCE_OPTIONS, input.budgetPreference);
  const transport = findOption(TRANSPORT_PREFERENCE_OPTIONS, input.transportPreference);
  const keywordPrompts = (input.travelKeywords || [])
    .map((keyword) => findOption(TRAVEL_STYLE_OPTIONS, keyword)?.prompt)
    .filter(Boolean);

  return `
[USER TRAVEL CONCEPT]
- Main concept: ${mainStyle ? `${mainStyle.label} - ${mainStyle.prompt}` : 'Balanced general trip'}
- Supporting keywords: ${
    keywordPrompts.length > 0 ? keywordPrompts.map((keyword) => `\n  - ${keyword}`).join('') : 'None'
  }
- Pace: ${pace ? `${pace.label} - ${pace.prompt}` : 'Balanced'}
- Budget preference: ${budget ? `${budget.label} - ${budget.prompt}` : 'Balanced'}
- Transport preference: ${transport ? `${transport.label} - ${transport.prompt}` : 'Flexible'}
`.trim();
}
