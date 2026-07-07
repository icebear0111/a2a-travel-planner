import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 타입 정의
// ============================================

export interface TravelPreferences {
  travelStyle: string[];
  companion: string;
  duration: string;
  budget: string;
  interests: string[];
}

export interface Recommendation {
  destination: string;
  description: string;
  highlights: string[];
  bestFor: string;
}

// ============================================
// 폴백 데이터 (AI 실패 시 사용)
// ============================================

const FALLBACK_RECOMMENDATIONS: Recommendation[] = [
  {
    destination: '오사카 (일본)',
    description:
      '먹거리 천국 오사카는 다코야키, 오코노미야키 등 길거리 음식부터 미슐랭 레스토랑까지 다양한 미식을 즐길 수 있는 도시입니다. 도톤보리의 화려한 네온사인과 활기찬 분위기가 매력적입니다.',
    highlights: ['도톤보리 맛집 투어', '유니버설 스튜디오', '오사카성'],
    bestFor: '맛집 탐방과 쇼핑을 좋아하는 분',
  },
  {
    destination: '다낭 (베트남)',
    description:
      '아름다운 해변과 저렴한 물가로 힐링 여행에 최적인 다낭입니다. 바나힐, 호이안 등 다양한 볼거리와 신선한 해산물 요리가 기다립니다.',
    highlights: ['미케비치 휴양', '바나힐 테마파크', '호이안 야경'],
    bestFor: '여유로운 휴양과 가성비를 원하는 분',
  },
  {
    destination: '방콕 (태국)',
    description:
      '화려한 사원, 맛있는 음식, 활기찬 야시장까지 볼거리와 즐길거리가 넘치는 방콕입니다. 저렴한 마사지와 쇼핑까지 모든 것을 즐길 수 있습니다.',
    highlights: ['왕궁 & 왓포', '짜뚜짝 시장', '루프탑 바'],
    bestFor: '다양한 경험을 원하는 활동적인 분',
  },
];

// ============================================
// 여행지 추천 Agent
// ============================================

export async function recommendDestinations(
  preferences: TravelPreferences
): Promise<Recommendation[]> {
  console.log('🎯 [Recommend Agent] 사용자 취향 분석 중...', preferences);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `당신은 전문 여행 컨설턴트입니다. 사용자의 취향에 맞는 최적의 여행지를 추천해주세요.

## 추천 규칙
1. 사용자의 여행 스타일, 동행자, 기간, 예산, 관심사를 종합적으로 고려
2. 한국인에게 인기 있고 접근성 좋은 여행지 위주로 추천
3. 각 여행지의 특색있는 매력 포인트를 강조
4. 정확하고 최신 정보 기반 추천

## 예산 기준 (1인 기준, 항공+숙박+활동 포함)
- 알뜰하게 (100만원 이하): 동남아, 일본 근교 등
- 적당하게 (100-200만원): 일본 주요 도시, 대만, 홍콩 등
- 여유롭게 (200만원 이상): 유럽, 미주, 호주 등

## 출력 형식 (JSON)
{
  "recommendations": [
    {
      "destination": "도시명 (국가)",
      "description": "2-3문장의 매력적인 설명",
      "highlights": ["특징1", "특징2", "특징3"],
      "bestFor": "이런 분에게 추천 (한 줄)"
    }
  ]
}

반드시 3개의 여행지를 추천하세요.`,
        },
        {
          role: 'user',
          content: `다음 조건에 맞는 여행지를 추천해주세요:

- 여행 스타일: ${preferences.travelStyle.length > 0 ? preferences.travelStyle.join(', ') : '특별한 선호 없음'}
- 동행자: ${preferences.companion}
- 여행 기간: ${preferences.duration}
- 예산: ${preferences.budget}
- 관심 활동: ${preferences.interests.length > 0 ? preferences.interests.join(', ') : '특별한 관심사 없음'}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');

    const result = JSON.parse(content) as { recommendations: Recommendation[] };
    console.log(
      '✅ [Recommend Agent] 추천 완료:',
      result.recommendations.map((r) => r.destination).join(', ')
    );

    return result.recommendations;
  } catch (error) {
    console.error('❌ [Recommend Agent] Error:', error);
    // 폴백: 기본 추천 반환
    return FALLBACK_RECOMMENDATIONS;
  }
}
