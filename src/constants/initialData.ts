import { AgentStatus } from '@/types/trip';

// 1. 홈 화면 데이터
export const homeSuggestions = [
  { text: '오사카 벚꽃 여행' },
  { text: '발리 힐링 휴양' },
  { text: '파리 로맨틱 투어' },
  { text: '방콕 맛집 탐방' },
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
