import { create } from 'zustand';
import {
  initialTripData,
  initialScheduleData,
  initialBudgetData,
  initialAgentStatus,
} from '@/data/dummyData';
import { TripStoreState, ActivityType, AgentStatus } from '@/types/trip';

// 1. 사용자 입력 데이터 구조 정의
// 항공권 정보
export interface FlightInput {
  originAirportCode: string; // 출발지
  destAirportCode: string; // 도착지
  price: number; // 왕복 비용
  departureDate: string; // 가는 날
  departureTime: string;
  returnDate: string; // 오는 날
  returnTime: string;
}

// 숙소 정보 (N개 가능)
export interface HotelInput {
  id: string; // 리스트 관리를 위한 유니크 ID
  name: string; // 숙소 이름
  price: number; // 숙박비
  checkIn: string; // 체크인
  checkOut: string; // 체크아웃
}

// 사용자 입력 구조
export interface UserInput {
  destination: string;
  flight: FlightInput;
  hotels: HotelInput[];
}

// 2. 백엔드 API 응답 데이터 구조 (AI 응답용)
interface ApiIntent {
  destination: string;
  duration: number;
  startDate: string | null;
  budgetLevel: string;
  companion: string;
  themes: string[];
}

interface ApiFlight {
  price: number;
  airportCode: string;
  airline: string;
  flightDuration: string;
  departureTime: string;
  returnTime: string;
}

interface ApiHotel {
  name: string;
  price: number;
  address: string;
  coordinate: { lat: number; lng: number };
  rating: string;
}

interface ApiBudget {
  status: 'PASS' | 'FAIL';
  totalCost: number;
  currency: string;
}

interface ApiActivity {
  id: string;
  title: string;
  desc?: string;
  type: string;
  price?: number;
  time: string;
  duration: string;
  location?: string;
}

interface ApiDayItem {
  day: number;
  activities: ApiActivity[];
}

interface ApiResultData {
  intent: ApiIntent;
  flight: ApiFlight;
  hotel: ApiHotel;
  itinerary: ApiDayItem[];
  budget: ApiBudget;
}

type StreamPayload =
  | { type: 'progress'; stepIndex: number; status: 'running' | 'complete'; message: string }
  | { type: 'result'; data: ApiResultData }
  | { type: 'error'; message: string };

// 3. 헬퍼 함수
async function fetchUnsplashImage(query: string): Promise<string> {
  try {
    const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    if (!accessKey) throw new Error('Unsplash Key missing');

    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&orientation=landscape&per_page=1`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
      }
    );

    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return `${data.results[0].urls.raw}&w=2560&h=1440&fit=crop&q=80&fmt=jpg`;
    }
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80';
  } catch (error) {
    console.error('Unsplash API Error:', error);
    return 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80';
  }
}

const safeCastType = (type: string): ActivityType => {
  const validTypes: ActivityType[] = [
    'sightseeing',
    'food',
    'transport',
    'shopping',
    'hotel',
    'flight',
    'theme',
    'coffee',
    'etc',
  ];
  return validTypes.includes(type as ActivityType) ? (type as ActivityType) : 'etc';
};

const mapStreamStatusToStoreStatus = (
  streamStatus: 'running' | 'complete'
): AgentStatus['status'] => {
  if (streamStatus === 'complete') return 'complete';
  return 'searching';
};

// 4. Store State 확장 인터페이스
interface ExtendedTripStoreState extends TripStoreState {
  userInput: UserInput;

  // 액션 함수들
  setUserInput: (data: Partial<UserInput>) => void; // 전체 업데이트용
  setFlightInput: (data: Partial<FlightInput>) => void;
  addHotel: () => void;
  removeHotel: (id: string) => void;
  updateHotel: (id: string, data: Partial<HotelInput>) => void;

  generateTrip: () => Promise<void>;
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
            id: Math.random().toString(36).substr(2, 9),
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
                  id: act.id || Math.random().toString(36).substr(2, 9),
                  title: act.title,
                  desc: act.desc || (act.type === 'sightseeing' ? '관광 명소' : '추천 장소'),
                  type: safeCastType(act.type),
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
}));
