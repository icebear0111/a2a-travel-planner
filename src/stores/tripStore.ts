import { create } from 'zustand';
import {
  initialTripData,
  initialScheduleData,
  initialBudgetData,
  initialAgentStatus,
} from '@/data/dummyData';
import { TripStoreState } from '@/types/trip';

export const useTripStore = create<TripStoreState>((set) => ({
  // 1. 상태 초기값 설정 (그대로 유지)
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

  // 일정 내용 수정하기 (몇 일차인지, 어떤 아이템인지, 바꿀 내용은 무엇인지)
  updateScheduleItem: (dayIndex, itemId, newContent) =>
    set((state) => {
      // 1. 해당 날짜(dayIndex)를 찾고
      // 2. 그 안의 스케줄 리스트에서 해당 아이템(itemId)을 찾아 내용 업데이트
      const newScheduleData = state.scheduleData.map((daySchedule) => {
        if (daySchedule.day === dayIndex) {
          return {
            ...daySchedule,
            // 데이터 구조에 따라 'schedules' 또는 'items' 등으로 이름이 다를 수 있습니다.
            // 여기서는 'schedules'라고 가정합니다. (확인 필요!)
            activities: daySchedule.activities.map((item) =>
              item.id === itemId ? { ...item, ...newContent } : item
            ),
          };
        }
        return daySchedule;
      });

      return { scheduleData: newScheduleData };
    }),

  // 일정 삭제하기
  deleteScheduleItem: (dayIndex, itemId) =>
    set((state) => {
      const newScheduleData = state.scheduleData.map((daySchedule) => {
        if (daySchedule.day === dayIndex) {
          return {
            ...daySchedule,
            activities: daySchedule.activities.filter((item) => item.id !== itemId),
          };
        }
        return daySchedule;
      });

      return { scheduleData: newScheduleData };
    }),
}));
