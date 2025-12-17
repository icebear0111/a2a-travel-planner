import { LucideIcon } from 'lucide-react';
import { ReactElement } from 'react';

export type ActivityType =
  | 'flight'
  | 'transport'
  | 'hotel'
  | 'sightseeing'
  | 'food'
  | 'theme'
  | 'shopping'
  | 'coffee';

// 활동 (Activity) 타입
export interface Activity {
  id: string;
  time: string;
  title: string;
  desc: string;
  icon: ReactElement<LucideIcon>; // Lucide 아이콘 컴포넌트
  type: ActivityType;
  duration: string;
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
    icon: ReactElement<LucideIcon>;
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
  selectedActivityId: string | null; // 👈 추가 필요
  

  // 액션들
  setIsMobile: (mobile: boolean) => void;
  setSelectedDay: (day: number) => void;
  setProgress: (progress: number) => void;
  updateAgentStatus: (index: number, newStatus: Partial<AgentStatus>) => void;
  updateScheduleItem: (dayIndex: number, itemId: string, newContent: Partial<Activity>) => void;
  deleteScheduleItem: (dayIndex: number, itemId: string) => void;
  setSelectedActivityId: (id: string | null) => void; // 👈 추가 필요
}
