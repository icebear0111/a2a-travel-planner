import { ReactNode } from 'react';

// ============================================
// 사용자 입력 관련 타입
// ============================================

// 항공권 입력 정보
export interface FlightInput {
  originAirportCode: string; // 출발지 공항 코드
  destAirportCode: string; // 도착지 공항 코드
  price: number; // 왕복 비용
  departureDate: string; // 가는 날 (YYYY-MM-DD)
  departureTime: string; // 가는 날 출발 시간 (HH:MM)
  returnDate: string; // 오는 날 (YYYY-MM-DD)
  returnTime: string; // 오는 날 출발 시간 (HH:MM)
}

// 숙소 입력 정보
export interface HotelInput {
  id: string; // 리스트 관리용 유니크 ID
  name: string; // 숙소 이름
  price: number; // 숙박비 (총액)
  checkIn: string; // 체크인 날짜
  checkOut: string; // 체크아웃 날짜
}

// 사용자 입력 전체 구조
export interface UserInput {
  destination: string;
  duration?: number; // 여행 기간 (일수)
  flight: FlightInput;
  hotels: HotelInput[];
  mustVisitPlaces?: string[]; // 꼭 가고 싶은 장소
  travelStyle?: string; // 대표 여행 컨셉
  travelKeywords?: string[]; // 보조 컨셉 키워드
  pace?: 'relaxed' | 'balanced' | 'packed'; // 일정 밀도
  budgetPreference?: 'budget' | 'balanced' | 'premium'; // 비용 성향
  transportPreference?: 'public' | 'walk-light' | 'flexible'; // 이동 성향
}

// ============================================
// AI 분석 결과 타입 (Intent)
// ============================================

export interface Intent {
  destination: string;
  startDate: string;
  duration: number;
  companion: string;
  budgetLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  themes: string[];
  travelStyle?: string;
  travelKeywords?: string[];
  pace?: UserInput['pace'];
  budgetPreference?: UserInput['budgetPreference'];
  transportPreference?: UserInput['transportPreference'];
}

// ============================================
// 활동 및 일정 관련 타입
// ============================================

export type ActivityType =
  | 'flight'
  | 'transport'
  | 'hotel'
  | 'sightseeing'
  | 'food'
  | 'theme'
  | 'shopping'
  | 'coffee'
  | 'etc';

// 활동 (Activity) 타입
export interface Activity {
  id: string;
  time: string;
  title: string;
  desc: string;
  icon?: ReactNode; // Lucide 아이콘 컴포넌트
  type: ActivityType;
  duration: string;
  price?: number;
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

// 일별 일정 (DaySchedule) 타입
export interface DaySchedule {
  day: number;
  date: string;
  theme: string;
  activities: Activity[];
}

// 여행 메인 데이터 (TripData) 타입
export interface TripData {
  title: string;
  subtitle: string;
  dates: string;
  days: number;
  image: string;
}

// 예산 데이터 타입
export interface BudgetData {
  total: number;
  currency: { rate: number; unit: string };
  breakdown: {
    category: string;
    amount: number;
    icon?: ReactNode;
    percent: number;
  }[];
  dailyBudget: { day: number; amount: number }[];
}

// 에이전트 상태 타입
export interface AgentStatus {
  name: string;
  icon: string;
  status: 'pending' | 'searching' | 'analyzing' | 'complete';
  desc: string;
  color: string;
}

// Zustand 스토어 상태 타입 (나중에 Store 만들 때 사용)
export interface TripStoreState {
  isMobile: boolean;
  planningProgress: number;
  currentAgentStatus: AgentStatus[];
  tripData: TripData;
  scheduleData: DaySchedule[];
  budgetData: BudgetData;
  selectedDay: number;
  selectedActivityId: string | null;
  isGenerating: boolean;

  // 액션들
  setIsMobile: (mobile: boolean) => void;
  setSelectedDay: (day: number) => void;
  setProgress: (progress: number) => void;
  updateAgentStatus: (index: number, newStatus: Partial<AgentStatus>) => void;
  updateScheduleItem: (dayIndex: number, itemId: string, newContent: Partial<Activity>) => void;
  deleteScheduleItem: (dayIndex: number, itemId: string) => void;
  setSelectedActivityId: (id: string | null) => void;
  setTripTitle: (title: string) => void;
  generateTrip: (userInput: string) => Promise<void>;
}
