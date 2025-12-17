import React from 'react';
import { Plane, Hotel, MapPin, DollarSign, Train, Camera, Utensils, Coffee } from 'lucide-react';
import { TripData, DaySchedule, BudgetData, AgentStatus, Activity } from '@/types/trip';

// 1. 홈 화면 데이터
export const homeSuggestions = [
  { emoji: '🌸', text: '오사카 벚꽃 여행', color: 'from-pink-500 to-rose-500' },
  { emoji: '🏖️', text: '발리 힐링 휴양', color: 'from-cyan-500 to-blue-500' },
  { emoji: '🗼', text: '파리 로맨틱 투어', color: 'from-violet-500 to-purple-500' },
  { emoji: '🍜', text: '방콕 맛집 탐방', color: 'from-orange-500 to-amber-500' },
];

export const homeRecentTrips = [
  {
    title: '도쿄 감성 여행',
    dates: '2024.12.20 ~ 12.24',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
    days: 5,
    status: 'completed',
  },
  {
    title: '방콕 미식 투어',
    dates: '2025.01.15 ~ 01.20',
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=300&fit=crop',
    days: 6,
    status: 'upcoming',
  },
];

// 2. 로딩 화면 초기 상태
export const initialAgentStatus: AgentStatus[] = [
  {
    name: 'Planner Agent',
    icon: '🧠',
    status: 'analyzing',
    desc: '여행 요청 분석 중...',
    color: 'violet',
  },
  {
    name: 'Flight Agent',
    icon: '✈️',
    status: 'searching',
    desc: '최적 항공편 검색 중...',
    color: 'blue',
  },
  {
    name: 'Hotel Agent',
    icon: '🏨',
    status: 'pending',
    desc: '숙소 옵션 분석 중...',
    color: 'amber',
  },
  {
    name: 'Route Planner',
    icon: '🗺️',
    status: 'pending',
    desc: '동선 최적화 준비 중...',
    color: 'emerald',
  },
  {
    name: 'Budget Agent',
    icon: '💰',
    status: 'pending',
    desc: '예산 계산 대기 중...',
    color: 'purple',
  },
];

// 3. 결과 화면 - 여행 정보
export const initialTripData: TripData = {
  title: '오사카 감성 여행',
  subtitle: '맛집 탐방 & 포토스팟 투어',
  dates: '2024.12.20 (금) ~ 12.24 (화)',
  days: 5,
  image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&h=400&fit=crop',
};

// 4. 결과 화면 - 일정 정보
export const initialScheduleData: DaySchedule[] = [
  {
    day: 1,
    date: '12/20 (금)',
    theme: '도착 & 도톤보리',
    activities: [
      {
        id: 'a1',
        time: '14:00',
        title: '간사이공항 도착',
        desc: '피치항공 MM312',
        icon: <Plane className="w-4 h-4" />,
        type: 'flight',
        duration: '-',
      },
      {
        id: 'a2',
        time: '15:30',
        title: '난카이 라피트 탑승',
        desc: '공항 → 난바역',
        icon: <Train className="w-4 h-4" />,
        type: 'transport',
        duration: '40분',
      },
      {
        id: 'a3',
        time: '16:30',
        title: 'Cross Hotel Osaka 체크인',
        desc: '난바역 근처',
        icon: <Hotel className="w-4 h-4" />,
        type: 'hotel',
        duration: '30분',
      },
      {
        id: 'a4',
        time: '18:00',
        title: '도톤보리 거리',
        desc: '글리코상 & 야경 투어',
        icon: <Camera className="w-4 h-4" />,
        type: 'sightseeing',
        duration: '2시간',
      },
      {
        id: 'a5',
        time: '20:00',
        title: '이치란 라멘',
        desc: '돈코츠 라멘 맛집',
        icon: <Utensils className="w-4 h-4" />,
        type: 'food',
        duration: '1시간',
      },
    ],
  },
  {
    day: 2,
    date: '12/21 (토)',
    theme: '오사카성 & 쇼핑',
    activities: [
      {
        id: 'b1',
        time: '09:00',
        title: '호텔 조식',
        desc: '1층 레스토랑',
        icon: <Coffee className="w-4 h-4" />,
        type: 'food',
        duration: '1시간',
      },
      {
        id: 'b2',
        time: '10:30',
        title: '오사카성 공원',
        desc: '천수각 & 정원 산책',
        icon: <Camera className="w-4 h-4" />,
        type: 'sightseeing',
        duration: '2시간',
      },
      {
        id: 'b3',
        time: '13:00',
        title: '구로몬 시장',
        desc: '점심 & 해산물 투어',
        icon: <Utensils className="w-4 h-4" />,
        type: 'food',
        duration: '2시간',
      },
      {
        id: 'b4',
        time: '15:30',
        title: '신사이바시 쇼핑',
        desc: '메인 쇼핑 거리',
        icon: <MapPin className="w-4 h-4" />,
        type: 'shopping',
        duration: '3시간',
      },
      {
        id: 'b5',
        time: '19:00',
        title: '야키니쿠 저녁',
        desc: '마츠자카규 전문점',
        icon: <Utensils className="w-4 h-4" />,
        type: 'food',
        duration: '1.5시간',
      },
    ],
  },
  {
    day: 3,
    date: '12/22 (일)',
    theme: '유니버설 스튜디오',
    activities: [
      {
        id: 'c1',
        time: '08:00',
        title: 'USJ 출발',
        desc: '난바역 → USJ역',
        icon: <Train className="w-4 h-4" />,
        type: 'transport',
        duration: '20분',
      },
      {
        id: 'c2',
        time: '09:00',
        title: 'USJ 입장',
        desc: '슈퍼 닌텐도 월드',
        icon: <Camera className="w-4 h-4" />,
        type: 'theme',
        duration: '8시간',
      },
    ],
  },
];

// 5. 결과 화면 - 예산 정보
export const initialBudgetData: BudgetData = {
  total: 1200000,
  currency: { rate: 900, unit: '¥100' },
  breakdown: [
    {
      category: '항공',
      amount: 450000,
      icon: <Plane className="w-4 h-4" />,
      color: 'bg-blue-500',
      percent: 37.5,
    },
    {
      category: '숙소',
      amount: 320000,
      icon: <Hotel className="w-4 h-4" />,
      color: 'bg-amber-500',
      percent: 26.7,
    },
    {
      category: '교통',
      amount: 80000,
      icon: <Train className="w-4 h-4" />,
      color: 'bg-emerald-500',
      percent: 6.7,
    },
    {
      category: '식비',
      amount: 200000,
      icon: <Utensils className="w-4 h-4" />,
      color: 'bg-rose-500',
      percent: 16.7,
    },
    {
      category: '입장/기타',
      amount: 150000,
      icon: <Camera className="w-4 h-4" />,
      color: 'bg-violet-500',
      percent: 12.5,
    },
  ],
  dailyBudget: [
    { day: 1, amount: 350000 },
    { day: 2, amount: 180000 },
    { day: 3, amount: 220000 },
    { day: 4, amount: 150000 },
    { day: 5, amount: 300000 },
  ],
};

// 6. 상세 화면 더미 데이터
export const spotData = {
  id: 'a4',
  title: '도톤보리 거리',
  subtitle: '글리코상 & 야경 투어',
  image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&h=400&fit=crop',
  time: '18:00 ~ 20:00',
  duration: '2시간',
  cost: '₩0 (무료)',
  rating: 4.8,
  reviews: 12847,
  description:
    '오사카의 대표적인 번화가로, 화려한 네온사인과 글리코 러닝맨 간판이 유명합니다. 다양한 맛집과 쇼핑거리가 밀집해 있어 오사카 여행의 필수 코스입니다.',
  tips: [
    '저녁 7시 이후 네온사인이 가장 화려해요',
    '글리코상 앞은 사진 대기줄이 길어요. 일찍 가세요!',
    '돈키호테 관람차에서 야경 사진 추천',
  ],
  nearbySpots: [
    { name: '이치란 라멘', type: '맛집', rating: 4.7, distance: '도보 2분' },
    { name: '돈키호테', type: '쇼핑', rating: 4.5, distance: '도보 1분' },
    { name: '쿠라 스시', type: '맛집', rating: 4.6, distance: '도보 5분' },
  ],
  alternatives: ['신세카이', '아메리카무라', '덴덴타운'],
};

// 타입별 스타일 매핑
export const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  flight: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  transport: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  hotel: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  sightseeing: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  food: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  shopping: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  theme: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
};
