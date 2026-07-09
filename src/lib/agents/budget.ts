import type { Intent } from './intent';
import type { FlightContext } from './flight';
import type { HotelContext } from './hotel';
import type { DayItinerary } from './route';

export interface BudgetResult {
  status: 'PASS' | 'FAIL';
  totalCost: number;
  currency: string;
  maxBudget: number;
  breakdown: {
    flight: number;
    hotel: number;
    activity: number;
  };
  suggestion?: { target: 'HOTEL' | 'ROUTE'; reason: string };
}

// route 에이전트가 일정 생성 시 하루 활동비 가이드로도 사용한다 (사전 예방이 사후 재조정보다 저렴)
export const BUDGET_LIMITS: Record<
  Intent['budgetLevel'],
  { hotelPerNight: number; activityPerDay: number }
> = {
  LOW: { hotelPerNight: 120000, activityPerDay: 80000 },
  MEDIUM: { hotelPerNight: 250000, activityPerDay: 150000 },
  HIGH: { hotelPerNight: 450000, activityPerDay: 280000 },
};

const isTripFixedCostActivity = (type: string) => type === 'flight' || type === 'hotel';

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

    // 3. 활동 비용 (항공/호텔 활동은 이미 별도 고정비에 포함되므로 제외)
    let activityCost = 0;
    itinerary.forEach((day) => {
      day.activities.forEach((act) => {
        if (isTripFixedCostActivity(act.type)) return;
        activityCost += act.price || 0;
      });
    });

    // 4. 총합 계산
    const totalCost = flightCost + totalHotelCost + activityCost;
    const limit = BUDGET_LIMITS[intent.budgetLevel] || BUDGET_LIMITS.MEDIUM;
    const maxHotelCost = limit.hotelPerNight * nights;
    const maxActivityCost = limit.activityPerDay * intent.duration;
    const maxBudget = flightCost + maxHotelCost + maxActivityCost;
    const status = totalCost <= maxBudget ? 'PASS' : 'FAIL';

    console.log(
      `🧾 예산 상세: 항공 ${flightCost.toLocaleString()} + 숙소 ${totalHotelCost.toLocaleString()} (${nights}박) + 활동 ${activityCost.toLocaleString()} / 권장 한도 ${maxBudget.toLocaleString()}`
    );

    if (status === 'PASS') {
      return {
        status,
        totalCost,
        currency: 'KRW',
        maxBudget,
        breakdown: {
          flight: flightCost,
          hotel: totalHotelCost,
          activity: activityCost,
        },
      };
    }

    const overage = totalCost - maxBudget;
    const hotelOverBudget = totalHotelCost > maxHotelCost * 1.15;
    const canAdjustRoute = activityCost > maxActivityCost || overage <= activityCost * 0.5;

    return {
      status,
      totalCost,
      currency: 'KRW',
      maxBudget,
      breakdown: {
        flight: flightCost,
        hotel: totalHotelCost,
        activity: activityCost,
      },
      suggestion: {
        target: hotelOverBudget && !canAdjustRoute ? 'HOTEL' : 'ROUTE',
        reason:
          hotelOverBudget && !canAdjustRoute
            ? `숙소 비용이 예산 수준보다 약 ${overage.toLocaleString()}원 높습니다.`
            : `활동/식비/교통 비용을 약 ${overage.toLocaleString()}원 줄이도록 무료 명소, 저렴한 식사, 짧은 동선 위주로 재구성하세요.`,
      },
    };
  } catch (error) {
    console.error('❌ [5-Budget] Error:', error);
    return {
      status: 'PASS',
      totalCost: 0,
      currency: 'KRW',
      maxBudget: 0,
      breakdown: {
        flight: 0,
        hotel: 0,
        activity: 0,
      },
    };
  }
}
