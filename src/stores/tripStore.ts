import { create } from 'zustand';
import { initialAgentStatus, sampleTrips, SampleTrip } from '@/constants/initialData';
import {
  TripStoreState,
  FlightInput,
  HotelInput,
  UserInput,
  TripData,
  DaySchedule,
  BudgetData,
  Activity,
  ActivityType,
} from '@/types/trip';
import { ApiActivity, ApiDayItem, StreamPayload } from '@/types/api';
import { DEFAULT_TRAVEL_IMAGE, fetchUnsplashImage } from '@/lib/utils/unsplash';
import {
  safeCastActivityType,
  mapStreamStatusToStoreStatus,
  generateId,
} from '@/lib/utils/typeHelpers';
import type { SavedTrip, SharedTrip } from '@/lib/firebase';

// 빈 초기값 정의
const emptyTripData: TripData = {
  title: '',
  subtitle: '',
  dates: '',
  days: 0,
  image: '',
};

const emptyScheduleData: DaySchedule[] = [];

const emptyBudgetData: BudgetData = {
  total: 0,
  currency: { rate: 0, unit: '' },
  breakdown: [],
  dailyBudget: [],
};

const removeActivityIcon = (activity: DaySchedule['activities'][0]) => {
  const cleanActivity = { ...activity };
  delete cleanActivity.icon;
  Object.keys(cleanActivity).forEach((key) => {
    const typedKey = key as keyof typeof cleanActivity;
    if (cleanActivity[typedKey] === undefined) {
      delete cleanActivity[typedKey];
    }
  });
  return cleanActivity;
};

const removeBudgetIcon = (breakdown: BudgetData['breakdown'][0]) => {
  const cleanBreakdown = { ...breakdown };
  delete cleanBreakdown.icon;
  Object.keys(cleanBreakdown).forEach((key) => {
    const typedKey = key as keyof typeof cleanBreakdown;
    if (cleanBreakdown[typedKey] === undefined) {
      delete cleanBreakdown[typedKey];
    }
  });
  return cleanBreakdown;
};

const ACTIVITY_CATEGORY_LABELS: Record<ActivityType, string> = {
  flight: '항공',
  hotel: '숙소',
  food: '식비',
  coffee: '식비',
  shopping: '쇼핑',
  sightseeing: '관광',
  theme: '관광',
  transport: '교통',
  etc: '기타',
};

const buildBudgetFromSchedule = (
  currentBudget: BudgetData,
  scheduleData: DaySchedule[]
): BudgetData => {
  const fixedFlightCost =
    currentBudget.breakdown.find((item) => item.category === '항공')?.amount || 0;
  const fixedHotelCost =
    currentBudget.breakdown.find((item) => item.category === '숙소')?.amount || 0;
  const totals: Record<string, number> = {};
  const dailyBudget = scheduleData.map((day) => {
    const amount = day.activities.reduce((sum, activity) => {
      const price = activity.price || 0;
      const category = ACTIVITY_CATEGORY_LABELS[activity.type] || '기타';

      if (category !== '항공' && category !== '숙소') {
        totals[category] = (totals[category] || 0) + price;
        return sum + price;
      }

      return sum;
    }, 0);

    return { day: day.day, amount };
  });
  const total =
    fixedFlightCost +
    fixedHotelCost +
    Object.values(totals).reduce((sum, amount) => sum + amount, 0);
  const getPercent = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);
  const breakdown = [
    { category: '항공', amount: fixedFlightCost },
    { category: '숙소', amount: fixedHotelCost },
    ...Object.entries(totals).map(([category, amount]) => ({ category, amount })),
  ]
    .filter((item) => item.amount > 0)
    .map((item) => ({
      ...item,
      percent: getPercent(item.amount),
    }));

  return {
    ...currentBudget,
    total,
    breakdown,
    dailyBudget,
  };
};

const createScheduleActivity = (
  type: ActivityType = 'etc',
  overrides: Partial<Activity> = {}
): Activity => ({
  id: generateId(),
  time: '10:00',
  title: '새 일정',
  desc: '직접 추가한 일정',
  type,
  duration: '1시간',
  price: 0,
  ...overrides,
});

type RegenerateMode = 'balanced' | 'cheaper' | 'relaxed' | 'fuller';

const mapApiActivityToScheduleActivity = (
  act: ApiActivity,
  destination: string,
  fallbackId?: string
): Activity => ({
  id: act.id || fallbackId || generateId(),
  title: act.title,
  desc: act.desc || (act.type === 'sightseeing' ? '관광 명소' : '추천 장소'),
  type: safeCastActivityType(act.type),
  price: act.price || 0,
  time: act.time,
  duration: act.duration,
  location: act.location || destination,
  address: act.address,
  placeId: act.placeId,
  coordinate: act.coordinate,
  isPlaceValidated: act.isPlaceValidated,
  travelTimeToNext: act.travelTimeToNext,
  travelDistanceToNext: act.travelDistanceToNext,
  travelMinutesToNext: act.travelMinutesToNext,
  travelMetersToNext: act.travelMetersToNext,
});

const mapApiDayToScheduleDay = (
  dayItem: ApiDayItem,
  destination: string,
  existingDay?: DaySchedule
): DaySchedule => ({
  day: dayItem.day,
  date: existingDay?.date || `Day ${dayItem.day}`,
  theme: existingDay?.theme || 'AI 추천 코스',
  activities: dayItem.activities.map((act) => mapApiActivityToScheduleActivity(act, destination)),
});

const mergeActivityEnrichment = (activity: Activity, enriched?: ApiActivity): Activity => {
  if (!enriched) return activity;

  return {
    ...activity,
    ...(enriched.location !== undefined ? { location: enriched.location } : {}),
    ...(enriched.address !== undefined ? { address: enriched.address } : {}),
    ...(enriched.placeId !== undefined ? { placeId: enriched.placeId } : {}),
    ...(enriched.coordinate !== undefined ? { coordinate: enriched.coordinate } : {}),
    ...(enriched.isPlaceValidated !== undefined
      ? { isPlaceValidated: enriched.isPlaceValidated }
      : {}),
    ...(enriched.travelTimeToNext !== undefined
      ? { travelTimeToNext: enriched.travelTimeToNext }
      : {}),
    ...(enriched.travelDistanceToNext !== undefined
      ? { travelDistanceToNext: enriched.travelDistanceToNext }
      : {}),
    ...(enriched.travelMinutesToNext !== undefined
      ? { travelMinutesToNext: enriched.travelMinutesToNext }
      : {}),
    ...(enriched.travelMetersToNext !== undefined
      ? { travelMetersToNext: enriched.travelMetersToNext }
      : {}),
  };
};

const serializeActivityForApi = (activity: Activity) => {
  const cleanActivity = removeActivityIcon(activity);
  return {
    ...cleanActivity,
    desc: cleanActivity.desc || '',
    price: cleanActivity.price || 0,
  };
};

const getReadableResponseError = async (response: Response) => {
  const rawText = await response.text().catch(() => '');
  const plainText = rawText
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return plainText || `서버 응답 오류 (${response.status})`;
};

const readSseData = (rawEvent: string) => {
  const data = rawEvent
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s?/, ''))
    .join('\n')
    .trim();

  return data || null;
};

// Store State 확장 인터페이스
interface ExtendedTripStoreState extends TripStoreState {
  userInput: UserInput;
  savedTrips: SavedTrip[];
  currentTripId: string | null;
  isSaving: boolean;
  isSharing: boolean;
  isRegeneratingSchedule: boolean;
  regeneratingDay: number | null;
  regeneratingActivityId: string | null;
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
  persistCurrentTrip: (userId: string) => Promise<string | null>;
  resetTrip: () => void;

  // 공유 관련 액션
  shareTripAndGetUrl: (userName: string) => Promise<string | null>;
  loadSharedTrip: (shareId: string) => Promise<SharedTrip | null>;

  // 샘플 일정 로드
  loadSampleTrip: (sampleId: string) => boolean;

  // 일정 편집 액션
  addScheduleItem: (dayIndex: number, activity?: Partial<Activity>) => void;
  moveScheduleItem: (dayIndex: number, sourceId: string, targetId: string) => void;
  regenerateDay: (dayIndex: number, mode?: RegenerateMode) => Promise<boolean>;
  replaceActivityWithAI: (dayIndex: number, itemId: string) => Promise<boolean>;
}

// 5. Store 구현
export const useTripStore = create<ExtendedTripStoreState>((set, get) => ({
  // 상태 초기값
  isMobile: true,
  planningProgress: 0,
  currentAgentStatus: initialAgentStatus,

  tripData: emptyTripData,
  scheduleData: emptyScheduleData,
  budgetData: emptyBudgetData,

  selectedDay: 1,
  selectedActivityId: null,
  isGenerating: false,

  // Firestore 관련 상태
  savedTrips: [],
  currentTripId: null,
  isSaving: false,
  isSharing: false,
  isRegeneratingSchedule: false,
  regeneratingDay: null,
  regeneratingActivityId: null,
  currentShareId: null,

  userInput: {
    destination: '',
    mustVisitPlaces: [],
    travelStyle: 'relaxed',
    travelKeywords: [],
    pace: 'balanced',
    budgetPreference: 'balanced',
    transportPreference: 'flexible',
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

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('text/event-stream')) {
        const message = await getReadableResponseError(response);
        throw new Error(message);
      }

      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      const handleRawEvent = async (rawEvent: string) => {
        const jsonStr = readSseData(rawEvent);
        if (!jsonStr) {
          if (rawEvent.trim().startsWith('<')) {
            throw new Error('서버가 스트림 대신 HTML 응답을 반환했습니다.');
          }
          return;
        }

        let parsed: StreamPayload;
        try {
          parsed = JSON.parse(jsonStr) as StreamPayload;
        } catch (error) {
          console.error('SSE JSON Parse Error:', error, 'Raw:', jsonStr);
          throw new Error('여행 계획 스트림을 해석하는 중 문제가 발생했습니다.');
        }

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

              // 1) 여행 기본 정보 매핑
              const newTripData = {
                title: data.intent.destination,
                subtitle: `${data.intent.duration - 1}박 ${data.intent.duration}일 AI 추천 여행`,
                dates: data.intent.startDate || '날짜 미정',
                days: data.intent.duration,
                image: DEFAULT_TRAVEL_IMAGE,
              };

              // 2) 일정 정보 매핑
              const newScheduleData = data.itinerary.map((dayItem) =>
                mapApiDayToScheduleDay(dayItem, data.intent.destination)
              );

              // 3) 예산 정보 매핑
              const totalFlightCost = data.flight.price || 0;
              const nights = Math.max(0, (data.intent.duration || 1) - 1);
              const totalHotelCost = (data.hotel.price || 0) * nights;

              let foodCost = 0;
              let shoppingCost = 0;
              let sightseeingCost = 0;
              let etcCost = 0;
              const dailyBudget = newScheduleData.map((day) => {
                const amount = day.activities.reduce((sum, act) => {
                  if (act.type === 'flight' || act.type === 'hotel') return sum;
                  return sum + (act.price || 0);
                }, 0);

                return { day: day.day, amount };
              });

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
              const apiTotalCost = data.budget?.totalCost;
              const displayTotal =
                typeof apiTotalCost === 'number' && apiTotalCost > 0 ? apiTotalCost : calculatedTotal;

              const getPercent = (amount: number) =>
                displayTotal > 0 ? Math.round((amount / displayTotal) * 100) : 0;

              const newBudgetData = {
                total: displayTotal,
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
                dailyBudget,
              };

              set({
                tripData: newTripData,
                scheduleData: newScheduleData,
                budgetData: newBudgetData,
                selectedDay: 1,
                isGenerating: false,
              });

              // 대표 이미지는 결과 화면 전환을 막지 않고 백그라운드에서 교체한다.
              void fetchUnsplashImage(data.intent.destination).then((image) => {
                set((state) =>
                  state.tripData.title === data.intent.destination
                    ? { tripData: { ...state.tripData, image } }
                    : state
                );
              });

          console.log('🎉 UI 업데이트 완료! 제목:', newTripData.title);
        } else if (parsed.type === 'enrichment') {
          set((state) => {
            if (state.tripData.title !== parsed.data.destination) return state;

            return {
              scheduleData: state.scheduleData.map((day) => {
                const enrichedDay = parsed.data.itinerary.find((item) => item.day === day.day);
                if (!enrichedDay) return day;

                return {
                  ...day,
                  activities: day.activities.map((activity) =>
                    mergeActivityEnrichment(
                      activity,
                      enrichedDay.activities.find((item) => item.id === activity.id)
                    )
                  ),
                };
              }),
            };
          });
          console.log('📍 지도 좌표와 이동시간 보강 완료');
        } else if (parsed.type === 'error') {
          throw new Error(parsed.message);
        }
      };

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        buffer += decoder.decode(value, { stream: !doneReading });

        let eventBoundary = buffer.indexOf('\n\n');
        while (eventBoundary !== -1) {
          const rawEvent = buffer.slice(0, eventBoundary);
          buffer = buffer.slice(eventBoundary + 2);
          if (rawEvent.trim()) {
            await handleRawEvent(rawEvent);
          }
          eventBoundary = buffer.indexOf('\n\n');
        }
      }

      if (buffer.trim()) {
        await handleRawEvent(buffer);
      }
    } catch (error) {
      console.error('Stream Error:', error);
      const message =
        error instanceof Error ? error.message : '여행 계획을 생성하는 중 문제가 발생했습니다.';
      alert(message);
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
      return {
        scheduleData: newScheduleData,
        budgetData: buildBudgetFromSchedule(state.budgetData, newScheduleData),
      };
    }),

  addScheduleItem: (dayIndex, activity) =>
    set((state) => {
      const newActivity = createScheduleActivity(
        safeCastActivityType(activity?.type || 'etc'),
        activity
      );
      const newScheduleData = state.scheduleData.map((daySchedule) => {
        if (daySchedule.day === dayIndex) {
          return {
            ...daySchedule,
            activities: [...daySchedule.activities, newActivity],
          };
        }
        return daySchedule;
      });

      return {
        scheduleData: newScheduleData,
        selectedActivityId: newActivity.id,
        budgetData: buildBudgetFromSchedule(state.budgetData, newScheduleData),
      };
    }),

  moveScheduleItem: (dayIndex, sourceId, targetId) =>
    set((state) => {
      if (sourceId === targetId) return state;

      const newScheduleData = state.scheduleData.map((daySchedule) => {
        if (daySchedule.day !== dayIndex) return daySchedule;

        const activities = [...daySchedule.activities];
        const sourceIndex = activities.findIndex((item) => item.id === sourceId);
        const targetIndex = activities.findIndex((item) => item.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) return daySchedule;

        const [movedItem] = activities.splice(sourceIndex, 1);
        activities.splice(targetIndex, 0, movedItem);

        return {
          ...daySchedule,
          activities,
        };
      });

      return {
        scheduleData: newScheduleData,
        budgetData: buildBudgetFromSchedule(state.budgetData, newScheduleData),
      };
    }),

  regenerateDay: async (dayIndex, mode = 'balanced') => {
    const { userInput, scheduleData, budgetData, tripData } = get();
    const currentDay = scheduleData.find((day) => day.day === dayIndex);

    if (!currentDay) {
      alert('다시 생성할 날짜를 찾을 수 없습니다.');
      return false;
    }

    set({
      isRegeneratingSchedule: true,
      regeneratingDay: dayIndex,
      regeneratingActivityId: null,
    });

    try {
      const response = await fetch('/api/regenerate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRequest: userInput,
          dayNumber: dayIndex,
          totalDays: scheduleData.length || tripData.days,
          mode,
          currentDay: {
            day: currentDay.day,
            activities: currentDay.activities.map(serializeActivityForApi),
          },
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || '일정 재생성에 실패했습니다.');
      }

      const data = (await response.json()) as { day: ApiDayItem };
      const destination = userInput.destination || tripData.title;
      const regeneratedDay = mapApiDayToScheduleDay(data.day, destination, currentDay);
      const newScheduleData = scheduleData.map((day) =>
        day.day === dayIndex ? regeneratedDay : day
      );

      set({
        scheduleData: newScheduleData,
        budgetData: buildBudgetFromSchedule(budgetData, newScheduleData),
        isRegeneratingSchedule: false,
        regeneratingDay: null,
        regeneratingActivityId: null,
      });

      return true;
    } catch (error) {
      console.error('일정 재생성 실패:', error);
      alert(error instanceof Error ? error.message : '일정 재생성에 실패했습니다.');
      set({ isRegeneratingSchedule: false, regeneratingDay: null, regeneratingActivityId: null });
      return false;
    }
  },

  replaceActivityWithAI: async (dayIndex, itemId) => {
    const { userInput, scheduleData, budgetData, tripData } = get();
    const currentDay = scheduleData.find((day) => day.day === dayIndex);
    const targetActivity = currentDay?.activities.find((activity) => activity.id === itemId);

    if (!currentDay || !targetActivity) {
      alert('대체할 일정을 찾을 수 없습니다.');
      return false;
    }

    set({
      isRegeneratingSchedule: true,
      regeneratingDay: null,
      regeneratingActivityId: itemId,
    });

    try {
      const response = await fetch('/api/regenerate-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userRequest: userInput,
          dayNumber: dayIndex,
          totalDays: scheduleData.length || tripData.days,
          mode: 'replace-activity',
          currentDay: {
            day: currentDay.day,
            activities: currentDay.activities.map(serializeActivityForApi),
          },
          targetActivity: serializeActivityForApi(targetActivity),
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorData?.error || '일정 대체에 실패했습니다.');
      }

      const data = (await response.json()) as { activity: ApiActivity };
      const destination = userInput.destination || tripData.title;
      const replacement = mapApiActivityToScheduleActivity(data.activity, destination, itemId);
      const newScheduleData = scheduleData.map((daySchedule) => {
        if (daySchedule.day !== dayIndex) return daySchedule;

        return {
          ...daySchedule,
          activities: daySchedule.activities.map((activity) =>
            activity.id === itemId ? replacement : activity
          ),
        };
      });

      set({
        scheduleData: newScheduleData,
        budgetData: buildBudgetFromSchedule(budgetData, newScheduleData),
        isRegeneratingSchedule: false,
        regeneratingDay: null,
        regeneratingActivityId: null,
      });

      return true;
    } catch (error) {
      console.error('일정 대체 실패:', error);
      alert(error instanceof Error ? error.message : '일정 대체에 실패했습니다.');
      set({ isRegeneratingSchedule: false, regeneratingDay: null, regeneratingActivityId: null });
      return false;
    }
  },

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

      return {
        scheduleData: newScheduleData,
        selectedActivityId: state.selectedActivityId === itemId ? null : state.selectedActivityId,
        budgetData: buildBudgetFromSchedule(state.budgetData, newScheduleData),
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
      const { saveTrip } = await import('@/lib/firebase');

      // icon 필드 제거 (Firestore 저장 불가)
      const cleanScheduleData = scheduleData.map((day) => ({
        ...day,
        activities: day.activities.map(removeActivityIcon),
      }));

      const cleanBudgetData = {
        ...budgetData,
        breakdown: budgetData.breakdown.map(removeBudgetIcon),
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
      const { getTrips } = await import('@/lib/firebase');
      const trips = await getTrips(userId);
      set({ savedTrips: trips });
    } catch (error) {
      console.error('여행 목록 불러오기 실패:', error);
    }
  },

  // 특정 여행 불러오기
  loadTrip: async (userId: string, tripId: string) => {
    try {
      const { getTrip } = await import('@/lib/firebase');
      const trip = await getTrip(userId, tripId);
      if (trip) {
        set({
          userInput: trip.userInput,
          tripData: trip.tripData,
          scheduleData: trip.scheduleData as DaySchedule[],
          budgetData: trip.budgetData as BudgetData,
          currentTripId: tripId,
          selectedDay: 1,
          isRegeneratingSchedule: false,
          regeneratingDay: null,
          regeneratingActivityId: null,
        });
      }
    } catch (error) {
      console.error('여행 불러오기 실패:', error);
    }
  },

  // 저장된 여행 삭제
  deleteSavedTrip: async (userId: string, tripId: string) => {
    try {
      const { deleteTrip } = await import('@/lib/firebase');
      await deleteTrip(userId, tripId);
      set((state) => ({
        savedTrips: state.savedTrips.filter((t) => t.id !== tripId),
        currentTripId: state.currentTripId === tripId ? null : state.currentTripId,
      }));
    } catch (error) {
      console.error('여행 삭제 실패:', error);
    }
  },

  persistCurrentTrip: async (userId: string) => {
    const { currentTripId, userInput, tripData, scheduleData, budgetData, saveCurrentTrip } = get();

    if (!currentTripId) {
      return saveCurrentTrip(userId);
    }

    set({ isSaving: true });

    try {
      const { updateTrip } = await import('@/lib/firebase');
      const cleanScheduleData = scheduleData.map((day) => ({
        ...day,
        activities: day.activities.map(removeActivityIcon),
      }));
      const cleanBudgetData = {
        ...budgetData,
        breakdown: budgetData.breakdown.map(removeBudgetIcon),
      };

      await updateTrip(userId, currentTripId, {
        userInput,
        tripData,
        scheduleData: cleanScheduleData,
        budgetData: cleanBudgetData,
      });

      set({ isSaving: false });
      return currentTripId;
    } catch (error) {
      console.error('여행 수정 저장 실패:', error);
      set({ isSaving: false });
      return null;
    }
  },

  // 여행 상태 초기화
  resetTrip: () =>
    set({
      tripData: emptyTripData,
      scheduleData: emptyScheduleData,
      budgetData: emptyBudgetData,
      currentTripId: null,
      currentShareId: null,
      selectedDay: 1,
      selectedActivityId: null,
      isRegeneratingSchedule: false,
      regeneratingDay: null,
      regeneratingActivityId: null,
      userInput: {
        destination: '',
        mustVisitPlaces: [],
        travelStyle: 'relaxed',
        travelKeywords: [],
        pace: 'balanced',
        budgetPreference: 'balanced',
        transportPreference: 'flexible',
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
      const { shareTrip } = await import('@/lib/firebase');

      // icon 필드 제거
      const cleanScheduleData = scheduleData.map((day) => ({
        ...day,
        activities: day.activities.map(removeActivityIcon),
      }));

      const cleanBudgetData = {
        ...budgetData,
        breakdown: budgetData.breakdown.map(removeBudgetIcon),
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
      const { getSharedTrip } = await import('@/lib/firebase');
      const sharedTrip = await getSharedTrip(shareId);
      if (sharedTrip) {
        set({
          userInput: sharedTrip.userInput,
          tripData: sharedTrip.tripData,
          scheduleData: sharedTrip.scheduleData as DaySchedule[],
          budgetData: sharedTrip.budgetData as BudgetData,
          currentShareId: shareId,
          selectedDay: 1,
          isRegeneratingSchedule: false,
          regeneratingDay: null,
          regeneratingActivityId: null,
        });
        return sharedTrip;
      }
      return null;
    } catch (error) {
      console.error('공유 여행 불러오기 실패:', error);
      return null;
    }
  },

  // 샘플 일정 로드
  loadSampleTrip: (sampleId: string) => {
    const sample = sampleTrips.find((trip: SampleTrip) => trip.id === sampleId);
    if (!sample) {
      console.error('샘플 일정을 찾을 수 없습니다:', sampleId);
      return false;
    }

    set({
      userInput: sample.userInput,
      tripData: sample.tripData,
      scheduleData: sample.scheduleData as DaySchedule[],
      budgetData: sample.budgetData as BudgetData,
      currentTripId: null,
      currentShareId: null,
      selectedDay: 1,
      isRegeneratingSchedule: false,
      regeneratingDay: null,
      regeneratingActivityId: null,
    });

    return true;
  },
}));
