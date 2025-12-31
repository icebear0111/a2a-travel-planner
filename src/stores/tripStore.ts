import { create } from 'zustand';
import {
  initialTripData,
  initialScheduleData,
  initialBudgetData,
  initialAgentStatus,
} from '@/constants/initialData';
import { TripStoreState, FlightInput, HotelInput, UserInput } from '@/types/trip';
import { StreamPayload } from '@/types/api';
import { fetchUnsplashImage } from '@/lib/utils/unsplash';
import {
  safeCastActivityType,
  mapStreamStatusToStoreStatus,
  generateId,
} from '@/lib/utils/typeHelpers';
import { saveTrip, getTrips, getTrip, deleteTrip, SavedTrip, shareTrip, getSharedTrip, SharedTrip } from '@/lib/firebase';

// Store State 확장 인터페이스
interface ExtendedTripStoreState extends TripStoreState {
  userInput: UserInput;
  savedTrips: SavedTrip[];
  currentTripId: string | null;
  isSaving: boolean;
  isSharing: boolean;
  currentShareId: string | null;

  // 액션 함수들
  setUserInput: (data: Partial<UserInput>) => void; // 전체 업데이트용
  setFlightInput: (data: Partial<FlightInput>) => void;
  addHotel: () => void;
  removeHotel: (id: string) => void;
  updateHotel: (id: string, data: Partial<HotelInput>) => void;

  generateTrip: () => Promise<void>;

  // Firestore 관련 액션
  saveCurrentTrip: (userId: string) => Promise<string | null>;
  loadMyTrips: (userId: string) => Promise<void>;
  loadTrip: (userId: string, tripId: string) => Promise<void>;
  deleteSavedTrip: (userId: string, tripId: string) => Promise<void>;
  resetTrip: () => void;

  // 공유 관련 액션
  shareTripAndGetUrl: (userName: string) => Promise<string | null>;
  loadSharedTrip: (shareId: string) => Promise<SharedTrip | null>;
}

// 5. Store 구현
export const useTripStore = create<ExtendedTripStoreState>((set, get) => ({
  // 상태 초기값
  isMobile: true,
  planningProgress: 0,
  currentAgentStatus: initialAgentStatus,

  tripData: initialTripData,
  scheduleData: initialScheduleData,
  budgetData: initialBudgetData,

  selectedDay: 1,
  selectedActivityId: null,
  isGenerating: false,

  // Firestore 관련 상태
  savedTrips: [],
  currentTripId: null,
  isSaving: false,
  isSharing: false,
  currentShareId: null,

  userInput: {
    destination: '',
    flight: {
      originAirportCode: '',
      destAirportCode: '',
      price: 0,
      departureDate: '',
      departureTime: '10:00',
      returnDate: '',
      returnTime: '18:00',
    },
    hotels: [
      {
        id: '1',
        name: '',
        price: 0,
        checkIn: '',
        checkOut: '',
      },
    ],
  },

  // 기본 액션 함수들
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  setSelectedDay: (day) => set({ selectedDay: day }),
  setProgress: (progress) => set({ planningProgress: progress }),
  setSelectedActivityId: (id) => set({ selectedActivityId: id }),
  setTripTitle: (title) => set((state) => ({ tripData: { ...state.tripData, title } })),

  updateAgentStatus: (index, newStatus) =>
    set((state) => {
      const newAgents = state.currentAgentStatus.map((agent, i) =>
        i === index ? { ...agent, ...newStatus } : agent
      );
      return { currentAgentStatus: newAgents };
    }),

  // 입력 폼 제어 액션들

  // 1. 목적지 등 최상위 정보 업데이트 (setUserInput은 덮어쓰기 방식으로 구현)
  setUserInput: (data) =>
    set((state) => ({
      userInput: { ...state.userInput, ...data },
    })),

  // 2. 항공권 정보 업데이트
  setFlightInput: (data) =>
    set((state) => ({
      userInput: {
        ...state.userInput,
        flight: { ...state.userInput.flight, ...data },
      },
    })),

  // 3. 숙소 추가
  addHotel: () =>
    set((state) => ({
      userInput: {
        ...state.userInput,
        hotels: [
          ...state.userInput.hotels,
          {
            id: generateId(),
            name: '',
            price: 0,
            checkIn: '',
            checkOut: '',
          },
        ],
      },
    })),

  // 4. 숙소 삭제
  removeHotel: (id) =>
    set((state) => ({
      userInput: {
        ...state.userInput,
        hotels: state.userInput.hotels.filter((h) => h.id !== id),
      },
    })),

  // 5. 숙소 정보 업데이트
  updateHotel: (id, data) =>
    set((state) => ({
      userInput: {
        ...state.userInput,
        hotels: state.userInput.hotels.map((h) => (h.id === id ? { ...h, ...data } : h)),
      },
    })),

  // AI 여행 생성 함수
  generateTrip: async () => {
    const input = get().userInput;

    // 유효성 검사
    if (!input.destination) {
      alert('여행지가 설정되지 않았습니다.');
      return;
    }

    // 👇 [수정] 날짜 검사 변수명 변경 (departureDate, returnDate)
    // 단, 날짜가 비어있어도(미정) 로직상 허용하기로 했다면 이 검사를 빼거나,
    // SetupScreen에서 처리하도록 위임할 수 있습니다.
    // 여기서는 '빈 문자열'일 경우 Intent Agent가 처리하므로 일단 주석 처리하거나 패스합니다.
    // if (!input.flight.departureDate || !input.flight.returnDate) { ... }

    set({ isGenerating: true, currentAgentStatus: initialAgentStatus });

    try {
      // API 호출 (변경된 UserInput 구조 전송)
      const response = await fetch('/api/plan-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRequest: input }),
      });

      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);

        const lines = chunkValue.split('\n\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          const jsonStr = line.replace('data: ', '');
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr) as StreamPayload;

            // (A) 진행 상황 업데이트
            if (parsed.type === 'progress') {
              const { stepIndex, status } = parsed;
              const currentAgents = get().currentAgentStatus;

              if (currentAgents[stepIndex]) {
                const newAgents = [...currentAgents];
                const storeStatus = mapStreamStatusToStoreStatus(status);
                newAgents[stepIndex] = { ...newAgents[stepIndex], status: storeStatus };
                set({ currentAgentStatus: newAgents });
              }
            }

            // (B) 최종 결과 수신
            else if (parsed.type === 'result') {
              const data = parsed.data;
              console.log('✨ 최종 데이터 수신:', data);

              const realImageUrl = await fetchUnsplashImage(data.intent.destination);

              // 1) 여행 기본 정보 매핑
              const newTripData = {
                title: data.intent.destination,
                subtitle: `${data.intent.duration - 1}박 ${data.intent.duration}일 AI 추천 여행`,
                dates: data.intent.startDate || '날짜 미정',
                days: data.intent.duration,
                image: realImageUrl,
              };

              // 2) 일정 정보 매핑
              const newScheduleData = data.itinerary.map((dayItem) => ({
                day: dayItem.day,
                date: `Day ${dayItem.day}`,
                theme: 'AI 추천 코스',
                activities: dayItem.activities.map((act) => ({
                  id: act.id || generateId(),
                  title: act.title,
                  desc: act.desc || (act.type === 'sightseeing' ? '관광 명소' : '추천 장소'),
                  type: safeCastActivityType(act.type),
                  price: act.price || 0,
                  time: act.time,
                  duration: act.duration,
                  location: act.location || data.intent.destination,
                })),
              }));

              // 3) 예산 정보 매핑
              const totalFlightCost = data.flight.price;
              const totalHotelCost = data.hotel.price;

              let foodCost = 0;
              let shoppingCost = 0;
              let sightseeingCost = 0;
              let etcCost = 0;

              newScheduleData.forEach((day) => {
                day.activities.forEach((act) => {
                  const price = act.price || 0;
                  switch (act.type) {
                    case 'flight':
                    case 'hotel':
                      // 항공/숙박비 중복 합산 방지 (Activity에 포함되어 있을 경우)
                      break;
                    case 'food':
                    case 'coffee':
                      foodCost += price;
                      break;
                    case 'shopping':
                      shoppingCost += price;
                      break;
                    case 'sightseeing':
                    case 'theme':
                      sightseeingCost += price;
                      break;
                    case 'transport':
                    case 'etc':
                    default:
                      etcCost += price;
                      break;
                  }
                });
              });

              const calculatedTotal =
                totalFlightCost +
                totalHotelCost +
                foodCost +
                shoppingCost +
                sightseeingCost +
                etcCost;

              const getPercent = (amount: number) =>
                calculatedTotal > 0 ? Math.round((amount / calculatedTotal) * 100) : 0;

              const newBudgetData = {
                total: calculatedTotal,
                currency: { rate: 1, unit: 'KRW' },
                breakdown: [
                  {
                    category: '항공',
                    amount: totalFlightCost,
                    percent: getPercent(totalFlightCost),
                  },
                  { category: '숙소', amount: totalHotelCost, percent: getPercent(totalHotelCost) },
                  { category: '식비', amount: foodCost, percent: getPercent(foodCost) },
                  { category: '쇼핑', amount: shoppingCost, percent: getPercent(shoppingCost) },
                  {
                    category: '관광',
                    amount: sightseeingCost,
                    percent: getPercent(sightseeingCost),
                  },
                  { category: '기타', amount: etcCost, percent: getPercent(etcCost) },
                ].filter((item) => item.amount > 0),
                dailyBudget: [],
              };

              set({
                tripData: newTripData,
                scheduleData: newScheduleData,
                budgetData: newBudgetData,
                selectedDay: 1,
              });

              console.log('🎉 UI 업데이트 완료! 제목:', newTripData.title);
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message);
            }
          } catch (e) {
            console.error('JSON Parse Error:', e, 'Raw:', jsonStr);
          }
        }
      }
    } catch (error) {
      console.error('Stream Error:', error);
      alert('여행 계획을 생성하는 중 문제가 발생했습니다.');
    } finally {
      set({ isGenerating: false });
    }
  },

  updateScheduleItem: (dayIndex, itemId, newContent) =>
    set((state) => {
      const newScheduleData = state.scheduleData.map((daySchedule) => {
        if (daySchedule.day === dayIndex) {
          return {
            ...daySchedule,
            activities: daySchedule.activities.map((item) =>
              item.id === itemId ? { ...item, ...newContent } : item
            ),
          };
        }
        return daySchedule;
      });
      return { scheduleData: newScheduleData };
    }),

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

      let reducedTotal = state.budgetData.total;
      const targetDay = state.scheduleData.find((d) => d.day === dayIndex);
      const deletedItem = targetDay?.activities.find((item) => item.id === itemId);

      if (deletedItem) {
        const itemWithPrice = deletedItem as { price?: number };
        const price = itemWithPrice.price || 50000;
        reducedTotal -= price;
      } else {
        reducedTotal -= 50000;
      }

      return {
        scheduleData: newScheduleData,
        budgetData: {
          ...state.budgetData,
          total: reducedTotal > 0 ? reducedTotal : 0,
        },
      };
    }),

  // ============================================
  // Firestore 관련 액션
  // ============================================

  // 현재 여행 계획 저장
  saveCurrentTrip: async (userId: string) => {
    const { userInput, tripData, scheduleData, budgetData } = get();

    // 유효성 검사
    if (!tripData.title || tripData.title === '여행 계획') {
      alert('저장할 여행 계획이 없습니다.');
      return null;
    }

    set({ isSaving: true });

    try {
      // icon 필드 제거 (Firestore 저장 불가)
      const cleanScheduleData = scheduleData.map((day) => ({
        ...day,
        activities: day.activities.map(({ icon, ...rest }) => rest),
      }));

      const cleanBudgetData = {
        ...budgetData,
        breakdown: budgetData.breakdown.map(({ icon, ...rest }) => rest),
      };

      const tripId = await saveTrip(userId, {
        userInput,
        tripData,
        scheduleData: cleanScheduleData,
        budgetData: cleanBudgetData,
      });

      set({ currentTripId: tripId, isSaving: false });
      return tripId;
    } catch (error) {
      console.error('여행 저장 실패:', error);
      set({ isSaving: false });
      return null;
    }
  },

  // 내 여행 목록 불러오기
  loadMyTrips: async (userId: string) => {
    try {
      const trips = await getTrips(userId);
      set({ savedTrips: trips });
    } catch (error) {
      console.error('여행 목록 불러오기 실패:', error);
    }
  },

  // 특정 여행 불러오기
  loadTrip: async (userId: string, tripId: string) => {
    try {
      const trip = await getTrip(userId, tripId);
      if (trip) {
        set({
          userInput: trip.userInput,
          tripData: trip.tripData,
          scheduleData: trip.scheduleData as typeof initialScheduleData,
          budgetData: trip.budgetData as typeof initialBudgetData,
          currentTripId: tripId,
          selectedDay: 1,
        });
      }
    } catch (error) {
      console.error('여행 불러오기 실패:', error);
    }
  },

  // 저장된 여행 삭제
  deleteSavedTrip: async (userId: string, tripId: string) => {
    try {
      await deleteTrip(userId, tripId);
      set((state) => ({
        savedTrips: state.savedTrips.filter((t) => t.id !== tripId),
        currentTripId: state.currentTripId === tripId ? null : state.currentTripId,
      }));
    } catch (error) {
      console.error('여행 삭제 실패:', error);
    }
  },

  // 여행 상태 초기화
  resetTrip: () =>
    set({
      tripData: initialTripData,
      scheduleData: initialScheduleData,
      budgetData: initialBudgetData,
      currentTripId: null,
      currentShareId: null,
      selectedDay: 1,
      selectedActivityId: null,
      userInput: {
        destination: '',
        flight: {
          originAirportCode: '',
          destAirportCode: '',
          price: 0,
          departureDate: '',
          departureTime: '10:00',
          returnDate: '',
          returnTime: '18:00',
        },
        hotels: [{ id: '1', name: '', price: 0, checkIn: '', checkOut: '' }],
      },
    }),

  // ============================================
  // 공유 관련 액션
  // ============================================

  // 여행 공유하기 (URL 생성)
  shareTripAndGetUrl: async (userName: string) => {
    const { userInput, tripData, scheduleData, budgetData, currentShareId } = get();

    // 이미 공유된 경우 기존 ID 반환
    if (currentShareId) {
      return currentShareId;
    }

    // 유효성 검사
    if (!tripData.title || tripData.title === '여행 계획') {
      alert('공유할 여행 계획이 없습니다.');
      return null;
    }

    set({ isSharing: true });

    try {
      // icon 필드 제거
      const cleanScheduleData = scheduleData.map((day) => ({
        ...day,
        activities: day.activities.map(({ icon, ...rest }) => rest),
      }));

      const cleanBudgetData = {
        ...budgetData,
        breakdown: budgetData.breakdown.map(({ icon, ...rest }) => rest),
      };

      const shareId = await shareTrip({
        userInput,
        tripData,
        scheduleData: cleanScheduleData,
        budgetData: cleanBudgetData,
        sharedBy: userName,
      });

      set({ currentShareId: shareId, isSharing: false });
      return shareId;
    } catch (error) {
      console.error('여행 공유 실패:', error);
      set({ isSharing: false });
      return null;
    }
  },

  // 공유된 여행 불러오기
  loadSharedTrip: async (shareId: string) => {
    try {
      const sharedTrip = await getSharedTrip(shareId);
      if (sharedTrip) {
        set({
          userInput: sharedTrip.userInput,
          tripData: sharedTrip.tripData,
          scheduleData: sharedTrip.scheduleData as typeof initialScheduleData,
          budgetData: sharedTrip.budgetData as typeof initialBudgetData,
          currentShareId: shareId,
          selectedDay: 1,
        });
        return sharedTrip;
      }
      return null;
    } catch (error) {
      console.error('공유 여행 불러오기 실패:', error);
      return null;
    }
  },
}));
