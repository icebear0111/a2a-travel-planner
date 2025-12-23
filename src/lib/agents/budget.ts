import { Intent } from './intent';
import { FlightContext } from './flight';
import { HotelContext } from './hotel';
import { DayItinerary } from './route'; // 파일명 4-route로 수정 확인 필요

export interface BudgetResult {
  status: 'PASS' | 'FAIL';
  totalCost: number;
  currency: string;
  suggestion?: { target: 'HOTEL' | 'ROUTE'; reason: string };
}

export async function verifyBudget(
  intent: Intent,
  flight: FlightContext,
  hotel: HotelContext,
  itinerary: DayItinerary[]
): Promise<BudgetResult> {
  console.log('💰 [5-Budget] 총 예산 집계 중...');

  try {
    // 1. 항공 비용 (이미 왕복 총액임)
    const flightCost = flight.price;

    // 2. 호텔 비용 (1박 가격 * 박수)
    // intent.duration이 3일이면 -> 2박
    const nights = Math.max(0, intent.duration - 1);
    const totalHotelCost = hotel.price * nights;

    // 3. 활동 비용 (모든 일차의 모든 활동 price 합산)
    let activityCost = 0;
    itinerary.forEach((day) => {
      day.activities.forEach((act) => {
        // 가격 정보가 있으면 더하고, 없으면(0이면) 패스
        activityCost += act.price || 0;
      });
    });

    // 4. 총합 계산
    const totalCost = flightCost + totalHotelCost + activityCost;

    console.log(
      `🧾 예산 상세: 항공 ${flightCost.toLocaleString()} + 숙소 ${totalHotelCost.toLocaleString()} (${nights}박) + 활동 ${activityCost.toLocaleString()}`
    );

    return {
      status: 'PASS',
      totalCost: totalCost,
      currency: 'KRW',
    };
  } catch (error) {
    console.error('❌ [5-Budget] Error:', error);
    return {
      status: 'PASS',
      totalCost: 0,
      currency: 'KRW',
    };
  }
}
