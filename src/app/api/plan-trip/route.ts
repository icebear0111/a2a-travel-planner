import { NextResponse } from 'next/server';
import { analyzeIntent } from '@/lib/agents/intent';
import { determineFlightConstraints } from '@/lib/agents/flight';
import { determineHotel } from '@/lib/agents/hotel';
import { generateItinerary } from '@/lib/agents/route';
import { verifyBudget } from '@/lib/agents/budget';
import { validateItineraryLocations } from '@/lib/utils/googleMaps';

// TripStore에 정의된 UserInput과 동일한 구조라고 가정 (타입 import 또는 any 사용)
// 여기서는 런타임에 userRequest가 넘어오므로 흐름만 제어하면 됩니다.

type StreamPayload =
  | { type: 'progress'; stepIndex: number; status: 'running' | 'complete'; message: string }
  | { type: 'result'; data: Record<string, unknown> }
  | { type: 'error'; message: string };

const encoder = new TextEncoder();

export async function POST(req: Request) {
  // 1. 사용자 요청 받기 (이제 userRequest는 단순 문자열이 아니라 UserInput 객체입니다)
  const { userRequest } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: StreamPayload) => {
        const text = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(text));
      };

      try {
        // ==========================================
        // 1단계. Intent (취향 분석)
        // ==========================================
        // 👇 [수정] userRequest 객체 전체를 넘깁니다.
        const intent = await analyzeIntent(userRequest);

        sendEvent({
          type: 'progress',
          stepIndex: 0,
          status: 'complete',
          message: '여행 취향 분석 완료',
        });

        // ==========================================
        // 2단계. Flight (항공권/교통)
        // ==========================================
        sendEvent({
          type: 'progress',
          stepIndex: 1,
          status: 'running',
          message: '교통편 일정 확인 중...',
        });

        // 👇 [수정] intent와 함께 userRequest(입력된 항공 정보)를 넘깁니다.
        const flightContext = await determineFlightConstraints(intent, userRequest);

        sendEvent({
          type: 'progress',
          stepIndex: 1,
          status: 'complete',
          message: '교통편 데이터 확보',
        });

        // ==========================================
        // 3단계. Hotel (숙소)
        // ==========================================
        sendEvent({
          type: 'progress',
          stepIndex: 2,
          status: 'running',
          message: '숙소 정보 확인 중...',
        });

        // 👇 [수정] flightContext와 userRequest(입력된 숙소 리스트)를 넘깁니다.
        const hotelContext = await determineHotel(intent, flightContext, userRequest);

        sendEvent({
          type: 'progress',
          stepIndex: 2,
          status: 'complete',
          message: '숙소 거점 확보',
        });

        // ==========================================
        // 4단계. Route (일정)
        // ==========================================
        // 숙소 좌표 체크 (사용자가 직접 입력했으면 좌표가 없을 수도 있음 -> Hotel 에이전트에서 처리됨)
        if (!hotelContext) throw new Error('숙소 정보를 확정할 수 없습니다.');

        sendEvent({
          type: 'progress',
          stepIndex: 3,
          status: 'running',
          message: '최적 동선 시뮬레이션 가동...',
        });

        // Route 에이전트는 기존 Context들을 활용하여 동선을 짭니다.
        // mustVisitPlaces가 있으면 함께 전달하여 일정에 반영
        let itinerary = await generateItinerary(
          intent,
          flightContext,
          hotelContext,
          undefined, // suggestion
          userRequest.mustVisitPlaces
        );
        itinerary = await validateItineraryLocations(itinerary, intent.destination);

        sendEvent({
          type: 'progress',
          stepIndex: 3,
          status: 'complete',
          message: '맞춤 일정 생성 완료',
        });

        // ==========================================
        // 5단계. Budget (예산)
        // ==========================================
        sendEvent({
          type: 'progress',
          stepIndex: 4,
          status: 'running',
          message: '예산 검토 중...',
        });

        let budgetCheck = await verifyBudget(intent, flightContext, hotelContext, itinerary);

        // 🔁 예산 초과 시 재시도 로직
        let retryCount = 0;
        const MAX_RETRIES = 1; // 재시도 횟수 줄임 (속도 위해)

        while (budgetCheck.status === 'FAIL' && retryCount < MAX_RETRIES) {
          console.log(`⚠️ 예산 초과! 조정 시도 ${retryCount + 1}`);

          if (budgetCheck.suggestion?.target === 'ROUTE') {
            itinerary = await generateItinerary(
              intent,
              flightContext,
              hotelContext,
              budgetCheck.suggestion,
              userRequest.mustVisitPlaces
            );
            itinerary = await validateItineraryLocations(itinerary, intent.destination);
          }
          // (Hotel 변경 제안은 사용자가 직접 입력한 경우 무시해야 하므로 여기선 Route만 재조정)

          budgetCheck = await verifyBudget(intent, flightContext, hotelContext, itinerary);
          retryCount++;
        }

        sendEvent({
          type: 'progress',
          stepIndex: 4,
          status: 'complete',
          message: '모든 계획 완료',
        });

        // ==========================================
        // ✅ 최종 결과 전송
        // ==========================================
        const finalResult = {
          intent,
          flight: flightContext,
          hotel: hotelContext,
          itinerary,
          budget: budgetCheck,
        };

        sendEvent({ type: 'result', data: finalResult as unknown as Record<string, unknown> });
      } catch (error: unknown) {
        console.error('Pipeline Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        sendEvent({ type: 'error', message: errorMessage });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
