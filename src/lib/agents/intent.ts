import OpenAI from 'openai';
import { UserInput, Intent } from '@/types/trip';

// 타입 재내보내기 (다른 에이전트에서 사용)
export type { UserInput, Intent };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 폴백용 테마 (AI 실패 시에만 사용)
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

export async function analyzeIntent(input: UserInput): Promise<Intent> {
  console.log(`🔍 [1-Intent] 사용자 의도 분석 중... 목적지: ${input.destination}`);

  // 1️⃣ 기간(Duration) 계산
  let duration = 3;
  let startDate = new Date().toISOString().split('T')[0];

  if (input.flight.departureDate && input.flight.returnDate) {
    startDate = input.flight.departureDate;
    const start = new Date(input.flight.departureDate);
    const end = new Date(input.flight.returnDate);
    const timeDiff = end.getTime() - start.getTime();
    duration = Math.max(1, Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1);
  } else {
    console.log('⚠️ [1-Intent] 날짜 미정: 기본 기간 3일로 설정');
  }

  // 계절 파악
  const month = new Date(startDate).getMonth() + 1;
  const season =
    month >= 3 && month <= 5
      ? '봄'
      : month >= 6 && month <= 8
      ? '여름'
      : month >= 9 && month <= 11
      ? '가을'
      : '겨울';

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `당신은 여행 의도 분석 전문가입니다.

## 분석 규칙
1. **destination**: 한국어 도시명으로 정규화 (Tokyo → 도쿄)
2. **companion**: 맥락에서 추론 (기본: "친구")
   - 허니문/로맨틱 → "커플"
   - 아이/가족 → "가족"
   - 혼자/솔로 → "혼자"
3. **budgetLevel**: 목적지와 기간으로 추론
   - 동남아 단기 → LOW~MEDIUM
   - 일본/대만 → MEDIUM
   - 유럽/미주 → HIGH
4. **themes**: 3개의 맞춤 테마 키워드 추천
   - 해당 도시의 특성과 매력 반영
   - 계절감 반영 (현재: ${season}, ${month}월)
   - 자유롭게 창의적으로 추천

## 출력 형식 (JSON)
{"destination":"string","companion":"string","budgetLevel":"LOW"|"MEDIUM"|"HIGH","themes":["string","string","string"]}`,
        },
        {
          role: 'user',
          content: `목적지: "${input.destination}"
출발일: ${startDate} (${duration}일간)
출발지: ${input.flight.originAirportCode || '미정'}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');

    const aiResult = JSON.parse(content);
    console.log(
      `✅ [1-Intent] 분석 완료: ${aiResult.destination} (테마: ${aiResult.themes?.join(', ')})`
    );

    return {
      destination: aiResult.destination || input.destination,
      startDate: startDate,
      duration: duration,
      companion: aiResult.companion || '친구',
      budgetLevel: aiResult.budgetLevel || 'MEDIUM',
      themes: aiResult.themes || DEFAULT_THEMES,
    };
  } catch (error) {
    console.error('❌ [1-Intent] Error:', error);
    // 폴백: 로컬 데이터 사용
    const fallbackThemes = FALLBACK_THEMES[input.destination] || DEFAULT_THEMES;

    return {
      destination: input.destination,
      startDate: startDate,
      duration: duration,
      companion: '친구',
      budgetLevel: 'MEDIUM',
      themes: fallbackThemes,
    };
  }
}
