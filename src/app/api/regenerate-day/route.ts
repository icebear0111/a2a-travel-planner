import { NextResponse } from 'next/server';
import { analyzeIntent } from '@/lib/agents/intent';
import { determineFlightConstraints } from '@/lib/agents/flight';
import { determineHotel } from '@/lib/agents/hotel';
import {
  Activity,
  DayItinerary,
  RegenerationMode,
  generateActivityReplacement,
  generateDayItinerary,
} from '@/lib/agents/route';
import { validateItineraryLocations } from '@/lib/utils/googleMaps';
import { UserInput } from '@/types/trip';

type RegenerateRequest = {
  userRequest: UserInput;
  dayNumber: number;
  totalDays?: number;
  currentDay?: DayItinerary;
  mode?: RegenerationMode | 'replace-activity';
  targetActivity?: Activity;
};

const MODE_SUGGESTIONS: Partial<Record<RegenerationMode, string>> = {
  cheaper: '사용자가 선택한 날짜의 비용을 낮추고 싶어합니다.',
  relaxed: '사용자가 선택한 날짜를 더 여유로운 페이스로 바꾸고 싶어합니다.',
  fuller: '사용자가 선택한 날짜에 조금 더 알찬 동선을 원합니다.',
};

export async function POST(req: Request) {
  try {
    const {
      userRequest,
      dayNumber,
      totalDays,
      currentDay,
      mode = 'balanced',
      targetActivity,
    } = (await req.json()) as RegenerateRequest;

    if (!userRequest?.destination || !dayNumber) {
      return NextResponse.json({ error: 'Missing trip context.' }, { status: 400 });
    }

    const intent = await analyzeIntent(userRequest);
    const normalizedIntent = {
      ...intent,
      duration: Math.max(totalDays || intent.duration, dayNumber),
    };
    const flight = await determineFlightConstraints(normalizedIntent, userRequest);
    const hotel = await determineHotel(normalizedIntent, flight, userRequest);

    if (mode === 'replace-activity') {
      if (!currentDay || !targetActivity) {
        return NextResponse.json(
          { error: 'Missing current day or target activity.' },
          { status: 400 }
        );
      }

      const replacement = await generateActivityReplacement(
        normalizedIntent,
        flight,
        hotel,
        currentDay,
        targetActivity,
        userRequest.mustVisitPlaces
      );
      const [validatedDay] = await validateItineraryLocations(
        [{ day: dayNumber, activities: [replacement] }],
        normalizedIntent.destination
      );

      return NextResponse.json({
        activity: validatedDay?.activities[0] || replacement,
      });
    }

    const suggestion = MODE_SUGGESTIONS[mode]
      ? { target: 'ROUTE' as const, reason: MODE_SUGGESTIONS[mode] }
      : undefined;

    const regeneratedDay = await generateDayItinerary(
      dayNumber,
      normalizedIntent.duration,
      normalizedIntent,
      flight,
      hotel,
      userRequest.mustVisitPlaces,
      suggestion,
      mode,
      currentDay?.activities
    );
    const [validatedDay] = await validateItineraryLocations(
      [regeneratedDay],
      normalizedIntent.destination
    );

    return NextResponse.json({ day: validatedDay || regeneratedDay });
  } catch (error) {
    console.error('Regenerate day error:', error);
    const message = error instanceof Error ? error.message : 'Failed to regenerate itinerary.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
