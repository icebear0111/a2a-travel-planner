// ============================================
// API 응답 데이터 타입 (백엔드 → 프론트엔드)
// ============================================

// Intent 에이전트 응답
export interface ApiIntent {
  destination: string;
  duration: number;
  startDate: string | null;
  budgetLevel: string;
  companion: string;
  themes: string[];
}

// Flight 에이전트 응답
export interface ApiFlight {
  price: number;
  airportCode: string;
  airline: string;
  flightDuration: string;
  departureTime: string;
  returnTime: string;
}

// Hotel 에이전트 응답
export interface ApiHotel {
  name: string;
  price: number;
  address: string;
  coordinate: { lat: number; lng: number };
  rating: string;
}

// Budget 에이전트 응답
export interface ApiBudget {
  status: 'PASS' | 'FAIL';
  totalCost: number;
  currency: string;
}

// 활동 데이터
export interface ApiActivity {
  id: string;
  title: string;
  desc?: string;
  type: string;
  price?: number;
  time: string;
  duration: string;
  location?: string;
}

// 일별 일정
export interface ApiDayItem {
  day: number;
  activities: ApiActivity[];
}

// 최종 API 응답 데이터
export interface ApiResultData {
  intent: ApiIntent;
  flight: ApiFlight;
  hotel: ApiHotel;
  itinerary: ApiDayItem[];
  budget: ApiBudget;
}

// SSE 스트림 페이로드 타입
export type StreamPayload =
  | { type: 'progress'; stepIndex: number; status: 'running' | 'complete'; message: string }
  | { type: 'result'; data: ApiResultData }
  | { type: 'error'; message: string };
