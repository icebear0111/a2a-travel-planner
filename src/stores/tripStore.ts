import { create } from 'zustand';
import {
  initialTripData,
  initialScheduleData,
  initialBudgetData,
  initialAgentStatus,
} from '@/data/dummyData';
import { TripStoreState } from '@/types/trip';

export const useTripStore = create<TripStoreState>((set) => ({
  // 1. 상태 초기값 설정
  isMobile: true,
  planningProgress: 0,
  currentAgentStatus: initialAgentStatus,
  tripData: initialTripData,
  scheduleData: initialScheduleData,
  budgetData: initialBudgetData,
  selectedDay: 1,

  // 2. 액션 함수 정의
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  setSelectedDay: (day) => set({ selectedDay: day }),
  setProgress: (progress) => set({ planningProgress: progress }),
  updateAgentStatus: (index, newStatus) =>
    set((state) => {
      const newAgents = state.currentAgentStatus.map((agent, i) =>
        i === index ? { ...agent, ...newStatus } : agent
      );
      return { currentAgentStatus: newAgents };
    }),
}));
