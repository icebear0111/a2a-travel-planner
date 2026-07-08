import { NextResponse } from 'next/server';
import { analyzeIntent } from '@/lib/agents/intent';
import { determineFlightConstraints } from '@/lib/agents/flight';
import { determineHotel } from '@/lib/agents/hotel';
import { DayItinerary, generateDayItinerary, generateItinerary } from '@/lib/agents/route';
import { verifyBudget } from '@/lib/agents/budget';
import { validateItineraryLocations } from '@/lib/utils/googleMaps';

// TripStore에 정의된 UserInput과 동일한 구조라고 가정 (타입 import 또는 any 사용)
// 여기서는 런타임에 userRequest가 넘어오므로 흐름만 제어하면 됩니다.

type StreamPayload =
  | { type: 'progress'; stepIndex: number; status: 'running' | 'complete'; message: string }
  | { type: 'trip-meta'; data: Record<string, unknown> }
  | { type: 'day-result'; data: { destination: string; totalDays: number; day: DayItinerary } }
  | { type: 'result'; data: Record<string, unknown> }
  | { type: 'enrichment'; data: { destination: string; itinerary: unknown[] } }
  | { type: 'error'; message: string };

const encoder = new TextEncoder();

async function measureStage<T>(name: string, task: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await task();
  } finally {
    console.log(`⏱️ [Pipeline] ${name}: ${Date.now() - startedAt}ms`);
  }
}

export async function POST(req: Request) {
  // 1. 사용자 요청 받기 (이제 userRequest는 단순 문자열이 아니라 UserInput 객체입니다)
  const { userRequest } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const pipelineStartedAt = Date.now();
      // 클라이언트가 연결을 끊으면 controller가 닫혀 enqueue가 throw한다.
      // 병렬 day-result 전송 중 그 예외가 일정 생성 실패로 둔갑하지 않도록 가드한다.
      let isStreamClosed = false;
      const sendEvent = (data: StreamPayload) => {
        if (isStreamClosed) return;
        try {
          const text = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(text));
        } catch {
          isStreamClosed = true;
        }
      };

      try {
        // ==========================================
        // 1단계. Intent (취향 분석)
        // ==========================================
        // 👇 [수정] userRequest 객체 전체를 넘깁니다.
        const intent = await measureStage('intent', () => analyzeIntent(userRequest));

        sendEvent({
          type: 'progress',
          stepIndex: 0,
          status: 'complete',
          message: '여행 취향 분석 완료',
        });

        // Flight와 Hotel은 Intent만 준비되면 서로 독립적으로 실행할 수 있다.
        sendEvent({
          type: 'progress',
          stepIndex: 1,
          status: 'running',
          message: '교통편 일정 확인 중...',
        });
        sendEvent({
          type: 'progress',
          stepIndex: 2,
          status: 'running',
          message: '숙소 정보 확인 중...',
        });

        const [flightContext, hotelContext] = await Promise.all([
          measureStage('flight', () => determineFlightConstraints(intent, userRequest)).then(
            (result) => {
              sendEvent({
                type: 'progress',
                stepIndex: 1,
                status: 'complete',
                message: '교통편 데이터 확보',
              });
              return result;
            }
          ),
          measureStage('hotel', () => determineHotel(intent, userRequest)).then((result) => {
            sendEvent({
              type: 'progress',
              stepIndex: 2,
              status: 'complete',
              message: '숙소 거점 확보',
            });
            return result;
          }),
        ]);

        // ==========================================
        // 4단계. Route (일정)
        // ==========================================
        // 숙소 좌표 체크 (사용자가 직접 입력했으면 좌표가 없을 수도 있음 -> Hotel 에이전트에서 처리됨)
        if (!hotelContext) throw new Error('숙소 정보를 확정할 수 없습니다.');

        // 프론트가 결과 화면 골격(제목·날짜 탭)을 미리 그릴 수 있도록 여행 메타를 먼저 보낸다.
        sendEvent({
          type: 'trip-meta',
          data: {
            intent,
            flight: flightContext,
            hotel: hotelContext,
          } as unknown as Record<string, unknown>,
        });

        sendEvent({
          type: 'progress',
          stepIndex: 3,
          status: 'running',
          message: '최적 동선 시뮬레이션 가동...',
        });

        // 일자별로 병렬 생성하되, 완료되는 날짜부터 즉시 스트리밍해
        // 사용자가 전체 완성을 기다리지 않고 Day 1부터 볼 수 있게 한다.
        const dayPromises = Array.from({ length: intent.duration }, (_, index) => {
          const dayNumber = index + 1;
          return measureStage(`route-day${dayNumber}`, () =>
            generateDayItinerary(
              dayNumber,
              intent.duration,
              intent,
              flightContext,
              hotelContext,
              userRequest.mustVisitPlaces
            )
          )
            .then((day) => {
              sendEvent({
                type: 'day-result',
                data: { destination: intent.destination, totalDays: intent.duration, day },
              });
              return day;
            })
            .catch((error): DayItinerary => {
              // 하루 생성 실패가 전체 여행 생성을 막지 않도록 빈 하루로 대체한다.
              console.error(`❌ [4-Route] Day ${dayNumber} 생성 실패:`, error);
              return { day: dayNumber, activities: [] };
            });
        });

        let itinerary = (await measureStage('route', () => Promise.all(dayPromises))).sort(
          (a, b) => a.day - b.day
        );

        sendEvent({
          type: 'progress',
          stepIndex: 4,
          status: 'running',
          message: '예산 검토 중...',
        });

        let budgetCheck = await measureStage('budget', () =>
          verifyBudget(intent, flightContext, hotelContext, itinerary)
        );

        // 🔁 예산 초과 시 재시도 로직
        let retryCount = 0;
        const MAX_RETRIES = 1; // 재시도 횟수 줄임 (속도 위해)

        while (budgetCheck.status === 'FAIL' && retryCount < MAX_RETRIES) {
          console.log(`⚠️ 예산 초과! 조정 시도 ${retryCount + 1}`);

          if (budgetCheck.suggestion?.target === 'ROUTE') {
            itinerary = await measureStage('route-retry', () =>
              generateItinerary(
                intent,
                flightContext,
                hotelContext,
                budgetCheck.suggestion,
                userRequest.mustVisitPlaces
              )
            );
          }
          // (Hotel 변경 제안은 사용자가 직접 입력한 경우 무시해야 하므로 여기선 Route만 재조정)

          budgetCheck = await verifyBudget(intent, flightContext, hotelContext, itinerary);
          retryCount++;
        }

        sendEvent({
          type: 'progress',
          stepIndex: 3,
          status: 'complete',
          message: '맞춤 일정 생성 완료',
        });

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
        console.log(`⏱️ [Pipeline] initial-result: ${Date.now() - pipelineStartedAt}ms`);

        // 좌표와 이동시간은 초기 결과를 막지 않고 후속 이벤트로 보강한다.
        try {
          const enrichedItinerary = await measureStage('maps', () =>
            validateItineraryLocations(itinerary, intent.destination)
          );
          sendEvent({
            type: 'enrichment',
            data: { destination: intent.destination, itinerary: enrichedItinerary },
          });
        } catch (error) {
          console.error('Map enrichment failed:', error);
        }

        console.log(`⏱️ [Pipeline] total: ${Date.now() - pipelineStartedAt}ms`);
      } catch (error: unknown) {
        console.error('Pipeline Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        sendEvent({ type: 'error', message: errorMessage });
      } finally {
        if (!isStreamClosed) {
          try {
            controller.close();
          } catch {
            // 클라이언트가 먼저 연결을 끊은 경우 — 무시한다.
          }
        }
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
