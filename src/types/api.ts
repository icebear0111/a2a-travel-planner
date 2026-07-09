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
  travelStyle?: string[];
}

// Flight 에이전트 응답 (국내여행은 기차·자차 등 다른 이동수단일 수 있음)
export interface ApiFlight {
  price: number;
  airportCode: string;
  airline: string;
  flightDuration: string;
  departureTime: string;
  returnTime: string;
  mode?: 'flight' | 'train' | 'bus' | 'car';
}

// Hotel 에이전트 응답
export interface ApiHotel {
  name: string;
  price: number;
  address: string;
  coordinate: { lat: number; lng: number };
  rating: string;
  placeId?: string;
  isPlaceValidated?: boolean;
}

// Budget 에이전트 응답
export interface ApiBudget {
  status: 'PASS' | 'FAIL';
  totalCost: number;
  currency: string;
  maxBudget?: number;
  breakdown?: {
    flight: number;
    hotel: number;
    activity: number;
  };
  suggestion?: {
    target: 'HOTEL' | 'ROUTE';
    reason: string;
  };
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
  address?: string;
  placeId?: string;
  coordinate?: { lat: number; lng: number };
  isPlaceValidated?: boolean;
  travelTimeToNext?: string;
  travelDistanceToNext?: string;
  travelMinutesToNext?: number;
  travelMetersToNext?: number;
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

// 여행 메타 (일정 생성 전에 미리 전송 — 결과 화면 골격용)
export interface ApiTripMeta {
  intent: ApiIntent;
  flight: ApiFlight;
  hotel: ApiHotel;
}

// SSE 스트림 페이로드 타입
export type StreamPayload =
  | { type: 'progress'; stepIndex: number; status: 'running' | 'complete'; message: string }
  | { type: 'trip-meta'; data: ApiTripMeta }
  | { type: 'day-result'; data: { destination: string; totalDays: number; day: ApiDayItem } }
  | { type: 'result'; data: ApiResultData }
  | { type: 'enrichment'; data: { destination: string; itinerary: ApiDayItem[] } }
  | { type: 'error'; message: string };
