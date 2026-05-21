import { Activity, DaySchedule } from '@/types/trip';

export type RouteQualityLevel = 'excellent' | 'good' | 'busy' | 'unknown';
export type TravelSegmentSource = 'directions' | 'coordinates' | 'schedule' | 'locality' | 'unknown';

export interface TravelSegmentQuality {
  fromId: string;
  toId: string;
  fromTitle: string;
  toTitle: string;
  minutes: number | null;
  distanceMeters: number | null;
  timeText?: string;
  distanceText?: string;
  level: RouteQualityLevel;
  source: TravelSegmentSource;
}

export interface RouteQualitySummary {
  score: number | null;
  level: RouteQualityLevel;
  label: string;
  description: string;
  totalTravelMinutes: number;
  longestSegmentMinutes: number;
  knownSegments: number;
  verifiedSegments: number;
  estimatedSegments: number;
  totalSegments: number;
  validatedPlaces: number;
  validateTargets: number;
  segments: TravelSegmentQuality[];
}

const SKIPPED_TYPES = new Set(['flight']);
const MAX_SCHEDULE_GAP_MINUTES = 180;
const MIN_SCHEDULE_GAP_MINUTES = 5;
const SAME_LOCALITY_ESTIMATE_MINUTES = 12;

export function parseTravelMinutes(text?: string): number | null {
  if (!text) return null;

  const normalizedText = text.toLowerCase();
  const hourMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(?:시간|hours?|hrs?|hr|h)/);
  const minuteMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(?:분|minutes?|mins?|min|m)/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

  if (!hourMatch && !minuteMatch) {
    const numeric = Number(normalizedText.replace(/[^\d.]/g, ''));
    return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
  }

  return Math.round(hours * 60 + minutes);
}

export function parseDistanceMeters(text?: string): number | null {
  if (!text) return null;

  const normalizedText = text.toLowerCase().replace(/,/g, '');
  const kmMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(?:km|킬로미터)/);
  const meterMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*(?:m|미터)/);

  if (kmMatch) return Math.round(Number(kmMatch[1]) * 1000);
  if (meterMatch) return Math.round(Number(meterMatch[1]));

  return null;
}

export function formatTravelMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}분`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

export function formatDistance(meters: number | null) {
  if (meters === null) return null;
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)}km`;
}

function getSegmentLevel(minutes: number | null): RouteQualityLevel {
  if (minutes === null) return 'unknown';
  if (minutes <= 25) return 'excellent';
  if (minutes <= 45) return 'good';
  return 'busy';
}

function getSummaryLevel(score: number | null): RouteQualityLevel {
  if (score === null) return 'unknown';
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  return 'busy';
}

function getSummaryCopy(level: RouteQualityLevel) {
  switch (level) {
    case 'excellent':
      return {
        label: '동선 우수',
        description: '짧은 이동 위주로 잘 묶인 일정입니다.',
      };
    case 'good':
      return {
        label: '동선 양호',
        description: '대체로 무난하지만 일부 이동은 확인해볼 만합니다.',
      };
    case 'busy':
      return {
        label: '동선 부담',
        description: '긴 이동 구간이 있어 일정 피로도가 높을 수 있습니다.',
      };
    default:
      return {
        label: '검증 대기',
        description: '지도 기반 이동 데이터가 아직 충분하지 않습니다.',
      };
  }
}

function shouldEvaluatePlace(activity: Activity) {
  return !SKIPPED_TYPES.has(activity.type);
}

function parseClockMinutes(time?: string): number | null {
  if (!time) return null;

  const match = time.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function estimateMinutesFromSchedule(activity: Activity, nextActivity: Activity): number | null {
  const start = parseClockMinutes(activity.time);
  const nextStartRaw = parseClockMinutes(nextActivity.time);
  const duration = parseTravelMinutes(activity.duration);

  if (start === null || nextStartRaw === null || duration === null) return null;

  const nextStart = nextStartRaw < start ? nextStartRaw + 24 * 60 : nextStartRaw;
  const gap = nextStart - (start + duration);

  if (gap >= MIN_SCHEDULE_GAP_MINUTES && gap <= MAX_SCHEDULE_GAP_MINUTES) {
    if (gap <= 20) return gap;
    if (gap <= 45) return Math.round(gap * 0.75);
    if (gap <= 90) return Math.round(gap * 0.5);
    return Math.round(gap * 0.4);
  }

  return null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getCoordinateDistanceMeters(activity: Activity, nextActivity: Activity): number | null {
  const from = activity.coordinate;
  const to = nextActivity.coordinate;

  if (!from || !to) return null;

  const earthRadiusMeters = 6371000;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return Math.round(earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

function estimateMinutesFromDistance(distanceMeters: number | null): number | null {
  if (distanceMeters === null) return null;
  if (distanceMeters <= 0) return null;

  if (distanceMeters <= 1200) {
    return Math.max(5, Math.round(distanceMeters / 75));
  }

  return Math.min(150, Math.max(12, Math.round(distanceMeters / 300 + 8)));
}

function normalizePlaceContext(value?: string) {
  return value
    ?.toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .trim();
}

function estimateMinutesFromLocality(activity: Activity, nextActivity: Activity): number | null {
  const current = normalizePlaceContext(activity.address || activity.location);
  const next = normalizePlaceContext(nextActivity.address || nextActivity.location);

  if (!current || !next || current.length < 3 || next.length < 3) return null;
  if (current === next) return SAME_LOCALITY_ESTIMATE_MINUTES;

  return null;
}

function getTravelSegmentEstimate(activity: Activity, nextActivity: Activity) {
  const explicitMinutes = activity.travelMinutesToNext ?? parseTravelMinutes(activity.travelTimeToNext);
  const explicitDistance =
    activity.travelMetersToNext ?? parseDistanceMeters(activity.travelDistanceToNext);

  if (explicitMinutes !== null) {
    return {
      minutes: explicitMinutes,
      distanceMeters: explicitDistance,
      source: 'directions' as TravelSegmentSource,
    };
  }

  const coordinateDistance = getCoordinateDistanceMeters(activity, nextActivity);
  const coordinateMinutes = estimateMinutesFromDistance(coordinateDistance);

  if (coordinateMinutes !== null) {
    return {
      minutes: coordinateMinutes,
      distanceMeters: coordinateDistance,
      source: 'coordinates' as TravelSegmentSource,
    };
  }

  const scheduleMinutes = estimateMinutesFromSchedule(activity, nextActivity);

  if (scheduleMinutes !== null) {
    return {
      minutes: scheduleMinutes,
      distanceMeters: explicitDistance,
      source: 'schedule' as TravelSegmentSource,
    };
  }

  const localityMinutes = estimateMinutesFromLocality(activity, nextActivity);

  return {
    minutes: localityMinutes,
    distanceMeters: explicitDistance,
    source: localityMinutes === null ? ('unknown' as TravelSegmentSource) : ('locality' as TravelSegmentSource),
  };
}

export function calculateRouteQuality(day?: DaySchedule): RouteQualitySummary {
  if (!day || day.activities.length < 2) {
    const copy = getSummaryCopy('unknown');
    return {
      score: null,
      level: 'unknown',
      ...copy,
      totalTravelMinutes: 0,
      longestSegmentMinutes: 0,
      knownSegments: 0,
      verifiedSegments: 0,
      estimatedSegments: 0,
      totalSegments: 0,
      validatedPlaces: 0,
      validateTargets: 0,
      segments: [],
    };
  }

  const validateTargets = day.activities.filter(shouldEvaluatePlace).length;
  const validatedPlaces = day.activities.filter(
    (activity) => shouldEvaluatePlace(activity) && activity.isPlaceValidated
  ).length;
  const segments = day.activities.slice(0, -1).flatMap((activity, index) => {
    const nextActivity = day.activities[index + 1];

    if (activity.type === 'flight' || nextActivity.type === 'flight') {
      return [];
    }

    const { minutes, distanceMeters, source } = getTravelSegmentEstimate(activity, nextActivity);

    return [
      {
        fromId: activity.id,
        toId: nextActivity.id,
        fromTitle: activity.title,
        toTitle: nextActivity.title,
        minutes,
        distanceMeters,
        timeText: activity.travelTimeToNext,
        distanceText: activity.travelDistanceToNext,
        level: getSegmentLevel(minutes),
        source,
      },
    ];
  });

  const knownSegments = segments.filter((segment) => segment.minutes !== null);
  const verifiedSegments = knownSegments.filter((segment) => segment.source === 'directions').length;
  const estimatedSegments = knownSegments.length - verifiedSegments;
  const totalTravelMinutes = knownSegments.reduce(
    (sum, segment) => sum + (segment.minutes || 0),
    0
  );
  const longestSegmentMinutes = knownSegments.reduce(
    (max, segment) => Math.max(max, segment.minutes || 0),
    0
  );

  const score =
    knownSegments.length === 0
      ? null
      : Math.max(
          0,
          Math.min(
            100,
            Math.round(
              100 -
                Math.max(0, totalTravelMinutes - knownSegments.length * 25) * 0.7 -
                Math.max(0, longestSegmentMinutes - 45) * 0.9 -
                (segments.length - knownSegments.length) * 10 -
                estimatedSegments * 2 -
                (validatedPlaces > 0 ? (validateTargets - validatedPlaces) * 2 : 0)
            )
          )
        );
  const level = getSummaryLevel(score);
  const copy =
    verifiedSegments === 0 && estimatedSegments > 0
      ? {
          ...getSummaryCopy(level),
          description: `${getSummaryCopy(level).description} Google Directions 실측 대신 일정 시간표 기반 추정입니다.`,
        }
      : getSummaryCopy(level);

  return {
    score,
    level,
    ...copy,
    totalTravelMinutes,
    longestSegmentMinutes,
    knownSegments: knownSegments.length,
    verifiedSegments,
    estimatedSegments,
    totalSegments: segments.length,
    validatedPlaces,
    validateTargets,
    segments,
  };
}
