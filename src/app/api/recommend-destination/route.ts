import { NextResponse } from 'next/server';
import { recommendDestinations, TravelPreferences } from '@/lib/agents/recommend';

export async function POST(req: Request) {
  try {
    const { preferences } = (await req.json()) as { preferences: TravelPreferences };

    const recommendations = await recommendDestinations(preferences);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('❌ [API] Recommend Error:', error);
    return NextResponse.json(
      { error: '여행지 추천 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
