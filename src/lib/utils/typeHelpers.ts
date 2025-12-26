import { ActivityType, AgentStatus } from '@/types/trip';

// 유효한 ActivityType 목록
const VALID_ACTIVITY_TYPES: ActivityType[] = [
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

/**
 * 문자열을 안전하게 ActivityType으로 변환
 * 유효하지 않은 타입은 'etc'로 반환
 */
export function safeCastActivityType(type: string): ActivityType {
  return VALID_ACTIVITY_TYPES.includes(type as ActivityType) ? (type as ActivityType) : 'etc';
}

/**
 * SSE 스트림 상태를 스토어 상태로 변환
 */
export function mapStreamStatusToStoreStatus(
  streamStatus: 'running' | 'complete'
): AgentStatus['status'] {
  return streamStatus === 'complete' ? 'complete' : 'searching';
}

/**
 * 랜덤 ID 생성 (숙소, 활동 등에 사용)
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}
