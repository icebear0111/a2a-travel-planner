import { AgentStatus, TripData, DaySchedule, BudgetData, UserInput } from '@/types/trip';

// 1. 홈 화면 데이터
export const homeSuggestions = [
  { text: '오사카 벚꽃 여행' },
  { text: '발리 힐링 휴양' },
  { text: '파리 로맨틱 투어' },
  { text: '방콕 맛집 탐방' },
];

// 추천 일정 샘플 데이터 타입
export interface SampleTrip {
  id: string;
  title: string;
  dates: string;
  image: string;
  days: number;
  status: string;
  description: string;
  tripData: TripData;
  scheduleData: DaySchedule[];
  budgetData: BudgetData;
  userInput: UserInput;
}

// 도쿄 감성 여행 샘플 데이터
const tokyoSampleTrip: SampleTrip = {
  id: 'sample-tokyo',
  title: '도쿄 감성 여행',
  dates: '4박 5일',
  image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop',
  days: 5,
  status: 'sample',
  description: '현대적인 네온 사인과 전통적인 문화가 공존하는 매력적인 도시.',
  tripData: {
    title: '도쿄',
    subtitle: '4박 5일 AI 추천 여행',
    dates: '샘플 일정',
    days: 5,
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop',
  },
  scheduleData: [
    {
      day: 1,
      date: 'Day 1',
      theme: '시부야 & 하라주쿠',
      activities: [
        { id: 't1-1', time: '10:00', title: '인천공항 출발', desc: '도쿄 나리타 공항행', type: 'flight', duration: '2시간 30분', price: 0 },
        { id: 't1-2', time: '14:00', title: '호텔 체크인', desc: '신주쿠 지역 호텔', type: 'hotel', duration: '1시간', price: 0 },
        { id: 't1-3', time: '16:00', title: '시부야 스크램블 교차로', desc: '세계에서 가장 붐비는 교차로 체험', type: 'sightseeing', duration: '1시간', price: 0 },
        { id: 't1-4', time: '17:30', title: '하치코 동상', desc: '충견 하치코를 기리는 동상', type: 'sightseeing', duration: '30분', price: 0 },
        { id: 't1-5', time: '19:00', title: '이치란 라멘', desc: '일본 대표 돈코츠 라멘', type: 'food', duration: '1시간', price: 15000 },
      ],
    },
    {
      day: 2,
      date: 'Day 2',
      theme: '아사쿠사 & 우에노',
      activities: [
        { id: 't2-1', time: '09:00', title: '센소지', desc: '도쿄에서 가장 오래된 사원', type: 'sightseeing', duration: '2시간', price: 0 },
        { id: 't2-2', time: '11:30', title: '나카미세 거리', desc: '전통 기념품과 간식 쇼핑', type: 'shopping', duration: '1시간 30분', price: 30000 },
        { id: 't2-3', time: '13:00', title: '우나기 히츠마부시', desc: '일본식 장어덮밥', type: 'food', duration: '1시간', price: 25000 },
        { id: 't2-4', time: '15:00', title: '우에노 공원', desc: '도쿄 최대의 공원 산책', type: 'sightseeing', duration: '2시간', price: 0 },
        { id: 't2-5', time: '18:00', title: '아메요코 시장', desc: '활기찬 재래시장 구경', type: 'shopping', duration: '1시간 30분', price: 20000 },
        { id: 't2-6', time: '20:00', title: '야키토리 골목', desc: '일본식 꼬치구이', type: 'food', duration: '1시간 30분', price: 20000 },
      ],
    },
    {
      day: 3,
      date: 'Day 3',
      theme: '하라주쿠 & 오모테산도',
      activities: [
        { id: 't3-1', time: '10:00', title: '메이지 신궁', desc: '도심 속 평화로운 신사', type: 'sightseeing', duration: '1시간 30분', price: 0 },
        { id: 't3-2', time: '12:00', title: '다케시타 거리', desc: '일본 청소년 문화의 중심', type: 'shopping', duration: '2시간', price: 50000 },
        { id: 't3-3', time: '14:30', title: '카와이이 몬스터 카페', desc: '독특한 테마 카페 체험', type: 'coffee', duration: '1시간', price: 15000 },
        { id: 't3-4', time: '16:00', title: '오모테산도 힐즈', desc: '럭셔리 쇼핑몰 구경', type: 'shopping', duration: '2시간', price: 0 },
        { id: 't3-5', time: '19:00', title: '규카츠 모토무라', desc: '도쿄 인기 규카츠 맛집', type: 'food', duration: '1시간', price: 20000 },
      ],
    },
    {
      day: 4,
      date: 'Day 4',
      theme: '오다이바 & 긴자',
      activities: [
        { id: 't4-1', time: '10:00', title: '팀랩 보더리스', desc: '몰입형 디지털 아트 뮤지엄', type: 'theme', duration: '3시간', price: 35000 },
        { id: 't4-2', time: '13:30', title: '오다이바 해변공원', desc: '레인보우 브릿지 전망', type: 'sightseeing', duration: '1시간', price: 0 },
        { id: 't4-3', time: '15:00', title: '다이버시티 도쿄', desc: '대형 건담 상과 쇼핑', type: 'shopping', duration: '2시간', price: 30000 },
        { id: 't4-4', time: '17:30', title: '긴자 거리', desc: '도쿄 최고의 쇼핑 거리', type: 'shopping', duration: '2시간', price: 0 },
        { id: 't4-5', time: '20:00', title: '스시 다이', desc: '신선한 오마카세 스시', type: 'food', duration: '1시간 30분', price: 50000 },
      ],
    },
    {
      day: 5,
      date: 'Day 5',
      theme: '신주쿠 & 귀국',
      activities: [
        { id: 't5-1', time: '09:00', title: '츠키지 아웃터 마켓', desc: '신선한 해산물 아침식사', type: 'food', duration: '2시간', price: 25000 },
        { id: 't5-2', time: '11:30', title: '호텔 체크아웃', desc: '짐 정리 및 출발 준비', type: 'hotel', duration: '30분', price: 0 },
        { id: 't5-3', time: '12:30', title: '신주쿠 교엔', desc: '아름다운 일본식 정원', type: 'sightseeing', duration: '1시간 30분', price: 5000 },
        { id: 't5-4', time: '15:00', title: '나리타 공항 이동', desc: '공항 철도 이용', type: 'transport', duration: '1시간 30분', price: 30000 },
        { id: 't5-5', time: '18:00', title: '인천공항 도착', desc: '귀국', type: 'flight', duration: '2시간 30분', price: 0 },
      ],
    },
  ],
  budgetData: {
    total: 1500000,
    currency: { rate: 1, unit: 'KRW' },
    breakdown: [
      { category: '항공', amount: 400000, percent: 27 },
      { category: '숙소', amount: 480000, percent: 32 },
      { category: '식비', amount: 280000, percent: 19 },
      { category: '관광', amount: 140000, percent: 9 },
      { category: '쇼핑', amount: 130000, percent: 9 },
      { category: '교통', amount: 70000, percent: 4 },
    ],
    dailyBudget: [],
  },
  userInput: {
    destination: '도쿄',
    travelStyle: ['culture', 'food', 'shopping'],
    flight: {
      originAirportCode: 'ICN',
      destAirportCode: 'NRT',
      price: 400000,
      departureDate: '',
      departureTime: '10:00',
      returnDate: '',
      returnTime: '18:00',
    },
    hotels: [{ id: '1', name: '신주쿠 호텔', price: 480000, checkIn: '', checkOut: '' }],
  },
};

// 방콕 미식 투어 샘플 데이터
const bangkokSampleTrip: SampleTrip = {
  id: 'sample-bangkok',
  title: '방콕 미식 투어',
  dates: '3박 4일',
  image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&h=600&fit=crop',
  days: 4,
  status: 'sample',
  description: '미식의 천국, 태국의 다양한 맛을 경험하는 여행.',
  tripData: {
    title: '방콕',
    subtitle: '3박 4일 AI 추천 여행',
    dates: '샘플 일정',
    days: 4,
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&h=600&fit=crop',
  },
  scheduleData: [
    {
      day: 1,
      date: 'Day 1',
      theme: '왕궁 & 왓포',
      activities: [
        { id: 'b1-1', time: '11:00', title: '인천공항 출발', desc: '방콕 수완나품 공항행', type: 'flight', duration: '5시간 30분', price: 0 },
        { id: 'b1-2', time: '15:00', title: '호텔 체크인', desc: '카오산 로드 근처 호텔', type: 'hotel', duration: '1시간', price: 0 },
        { id: 'b1-3', time: '17:00', title: '왓 아룬 (새벽 사원)', desc: '차오프라야 강변의 아름다운 사원', type: 'sightseeing', duration: '1시간 30분', price: 3000 },
        { id: 'b1-4', time: '19:00', title: '팟타이 띱 사마이', desc: '방콕 최고의 팟타이 맛집', type: 'food', duration: '1시간', price: 5000 },
        { id: 'b1-5', time: '21:00', title: '카오산 로드 야시장', desc: '배낭여행자의 거리 탐험', type: 'shopping', duration: '2시간', price: 15000 },
      ],
    },
    {
      day: 2,
      date: 'Day 2',
      theme: '시암 & 쇼핑',
      activities: [
        { id: 'b2-1', time: '08:00', title: '왕궁 (그랜드 팰리스)', desc: '태국 왕실의 화려한 건축물', type: 'sightseeing', duration: '2시간', price: 15000 },
        { id: 'b2-2', time: '10:30', title: '왓 포', desc: '거대한 와불상이 있는 사원', type: 'sightseeing', duration: '1시간 30분', price: 6000 },
        { id: 'b2-3', time: '12:30', title: '똠얌꿍 & 카오팟', desc: '전통 태국 음식 점심', type: 'food', duration: '1시간', price: 8000 },
        { id: 'b2-4', time: '14:30', title: '시암 파라곤', desc: '방콕 최대 쇼핑몰', type: 'shopping', duration: '3시간', price: 50000 },
        { id: 'b2-5', time: '18:00', title: '망고 탱고', desc: '유명 망고 디저트 카페', type: 'coffee', duration: '1시간', price: 8000 },
        { id: 'b2-6', time: '20:00', title: '쏨분 씨푸드', desc: '유명 씨푸드 레스토랑', type: 'food', duration: '1시간 30분', price: 25000 },
      ],
    },
    {
      day: 3,
      date: 'Day 3',
      theme: '수상시장 & 마사지',
      activities: [
        { id: 'b3-1', time: '06:00', title: '담넌사두악 수상시장', desc: '전통 수상시장 체험', type: 'sightseeing', duration: '3시간', price: 20000 },
        { id: 'b3-2', time: '10:00', title: '보트 누들', desc: '수상시장 명물 쌀국수', type: 'food', duration: '30분', price: 3000 },
        { id: 'b3-3', time: '13:00', title: '아시아티크 더 리버프론트', desc: '강변 야외 쇼핑몰', type: 'shopping', duration: '2시간', price: 30000 },
        { id: 'b3-4', time: '16:00', title: '왓 타이 마사지', desc: '전통 태국 마사지 2시간', type: 'etc', duration: '2시간', price: 25000 },
        { id: 'b3-5', time: '19:00', title: '버티고 루프탑 바', desc: '방콕 야경 감상', type: 'food', duration: '2시간', price: 40000 },
      ],
    },
    {
      day: 4,
      date: 'Day 4',
      theme: '짜뚜짝 & 귀국',
      activities: [
        { id: 'b4-1', time: '09:00', title: '짜뚜짝 주말시장', desc: '세계 최대 규모 주말시장', type: 'shopping', duration: '3시간', price: 40000 },
        { id: 'b4-2', time: '12:30', title: '카오막가이', desc: '태국식 치킨 라이스', type: 'food', duration: '1시간', price: 5000 },
        { id: 'b4-3', time: '14:00', title: '호텔 체크아웃', desc: '짐 정리 및 출발 준비', type: 'hotel', duration: '30분', price: 0 },
        { id: 'b4-4', time: '15:00', title: '수완나품 공항 이동', desc: '택시 이용', type: 'transport', duration: '1시간', price: 15000 },
        { id: 'b4-5', time: '19:00', title: '인천공항 도착', desc: '귀국', type: 'flight', duration: '5시간 30분', price: 0 },
      ],
    },
  ],
  budgetData: {
    total: 800000,
    currency: { rate: 1, unit: 'KRW' },
    breakdown: [
      { category: '항공', amount: 300000, percent: 38 },
      { category: '숙소', amount: 180000, percent: 22 },
      { category: '식비', amount: 120000, percent: 15 },
      { category: '관광', amount: 70000, percent: 9 },
      { category: '쇼핑', amount: 135000, percent: 17 },
    ],
    dailyBudget: [],
  },
  userInput: {
    destination: '방콕',
    travelStyle: ['food', 'culture', 'shopping'],
    flight: {
      originAirportCode: 'ICN',
      destAirportCode: 'BKK',
      price: 300000,
      departureDate: '',
      departureTime: '11:00',
      returnDate: '',
      returnTime: '19:00',
    },
    hotels: [{ id: '1', name: '카오산 호텔', price: 180000, checkIn: '', checkOut: '' }],
  },
};

// 추천 일정 목록 (HomeScreen에서 사용)
export const sampleTrips: SampleTrip[] = [tokyoSampleTrip, bangkokSampleTrip];

// 기존 homeRecentTrips (하위 호환성 유지)
export const homeRecentTrips = sampleTrips.map((trip) => ({
  title: trip.title,
  dates: trip.dates,
  image: trip.image,
  days: trip.days,
  status: trip.status,
}));

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
