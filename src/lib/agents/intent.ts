import { UserInput, Intent } from '@/types/trip';

// 타입 재내보내기 (다른 에이전트에서 사용)
export type { UserInput, Intent };

// ============================================
// 목적지별 기본 테마
// ============================================
const FALLBACK_THEMES: Record<string, string[]> = {
  도쿄: ['맛집', '쇼핑', '핫플'],
  오사카: ['맛집', '핫플', '쇼핑'],
  교토: ['역사', '사찰', '맛집'],
  후쿠오카: ['맛집', '온천', '자연'],
  방콕: ['맛집', '쇼핑', '마사지'],
  발리: ['휴양', '스파', '자연'],
  다낭: ['휴양', '해변', '맛집'],
  파리: ['예술', '맛집', '쇼핑'],
};

const DEFAULT_THEMES = ['맛집', '핫플', '쇼핑'];

const DESTINATION_ALIASES: Record<string, string> = {
  tokyo: '도쿄',
  osaka: '오사카',
  kyoto: '교토',
  fukuoka: '후쿠오카',
  sapporo: '삿포로',
  bangkok: '방콕',
  bali: '발리',
  danang: '다낭',
  'da nang': '다낭',
  paris: '파리',
  london: '런던',
};

const STYLE_THEMES: Record<string, string> = {
  budget: '가성비',
  relaxed: '힐링',
  packed: '핵심 명소',
  food: '맛집',
  culture: '문화·역사',
  nature: '자연',
  shopping: '쇼핑',
};

const HIGH_BUDGET_DESTINATIONS = new Set(['파리', '런던']);

const isValidDuration = (duration: unknown): duration is number =>
  typeof duration === 'number' && Number.isFinite(duration) && duration >= 1;

export async function analyzeIntent(input: UserInput): Promise<Intent> {
  console.log(`🔍 [1-Intent] 사용자 의도 분석 중... 목적지: ${input.destination}`);

  // 입력 폼에서 이미 구조화된 값은 다시 AI로 해석하지 않는다.
  let duration = isValidDuration(input.duration) ? input.duration : 3;
  let startDate = new Date().toISOString().split('T')[0];

  if (input.flight.departureDate && input.flight.returnDate) {
    startDate = input.flight.departureDate;
    const start = new Date(input.flight.departureDate);
    const end = new Date(input.flight.returnDate);
    const timeDiff = end.getTime() - start.getTime();
    duration = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1);
  } else {
    console.log(`⚠️ [1-Intent] 날짜 미정: 입력된 기간 또는 기본값 ${duration}일로 설정`);
  }

  const rawDestination = input.destination.trim();
  const destination = DESTINATION_ALIASES[rawDestination.toLowerCase()] || rawDestination;

  const month = new Date(startDate).getMonth() + 1;
  const season =
    month >= 3 && month <= 5
      ? '봄'
      : month >= 6 && month <= 8
      ? '여름'
      : month >= 9 && month <= 11
      ? '가을'
      : '겨울';

  const fallbackThemes = FALLBACK_THEMES[destination] || DEFAULT_THEMES;
  const preferredThemes = [input.travelStyle, ...(input.travelKeywords || [])]
    .map((style) => (style ? STYLE_THEMES[style] : undefined))
    .filter((theme): theme is string => Boolean(theme));
  const themes = [...new Set([...preferredThemes, `${season} 여행`, ...fallbackThemes])].slice(0, 3);

  const budgetLevel: Intent['budgetLevel'] =
    input.budgetPreference === 'budget'
      ? 'LOW'
      : input.budgetPreference === 'premium' || HIGH_BUDGET_DESTINATIONS.has(destination)
        ? 'HIGH'
        : 'MEDIUM';

  console.log(`✅ [1-Intent] 로컬 분석 완료: ${destination} (테마: ${themes.join(', ')})`);

  return {
    destination,
    startDate,
    duration,
    companion: '친구',
    budgetLevel,
    themes,
    travelStyle: input.travelStyle,
    travelKeywords: input.travelKeywords || [],
    pace: input.pace || 'balanced',
    budgetPreference: input.budgetPreference || 'balanced',
    transportPreference: input.transportPreference || 'flexible',
  };
}
