import type { Activity } from '@/types/trip';

export interface MapUrls {
  embed: string;
  external: string;
}

interface PlaceRef {
  query: string;
  placeId?: string;
}

// 비행·이동 활동은 실제 장소가 아니라 경로를 오염시키므로 지도 경로에서 제외한다.
const NON_PLACE_TYPES = new Set(['flight', 'transport']);

// 이 거리(최장 구간)를 넘으면 도보 대신 차량 경로로 표시한다.
const WALKING_MAX_SEGMENT_METERS = 2500;

// 장소 참조: 검증된 placeId가 있으면 최우선으로 쓰고(자유 텍스트 재지오코딩 방지),
// 없으면 주소 → "이름, 도시" 순으로 폴백한다.
function toPlaceRef(activity: Activity, destination: string): PlaceRef {
  const context = activity.location || destination;
  const query = activity.address
    ? activity.address
    : activity.title.includes(context)
      ? activity.title
      : `${activity.title}, ${context}`;

  if (activity.isPlaceValidated && activity.placeId) {
    return { query, placeId: activity.placeId };
  }
  return { query };
}

const embedParam = (ref: PlaceRef) =>
  encodeURIComponent(ref.placeId ? `place_id:${ref.placeId}` : ref.query);

const singlePlaceUrls = (ref: PlaceRef, apiKey: string): MapUrls => ({
  embed: `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${embedParam(ref)}&zoom=15`,
  external: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ref.query)}${
    ref.placeId ? `&query_place_id=${ref.placeId}` : ''
  }`,
});

function haversineMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(lngDelta / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
}

export function buildDayMapUrls(params: {
  activities: Activity[];
  destination: string;
  focusedActivityId: string | null;
  apiKey: string;
  /** 자차·렌터카 여행자는 거리와 무관하게 차량 경로로 표시 */
  preferDriving?: boolean;
}): MapUrls {
  const { activities, destination, focusedActivityId, apiKey, preferDriving = false } = params;

  if (activities.length === 0 || !destination) {
    return { embed: '', external: '' };
  }

  // 특정 장소 선택 모드
  if (focusedActivityId) {
    const activity = activities.find((a) => a.id === focusedActivityId);
    if (activity) {
      return singlePlaceUrls(toPlaceRef(activity, destination), apiKey);
    }
  }

  // 전체 경로 모드: 장소가 아닌 활동을 제외하고,
  // 연속으로 같은 장소가 반복되면(호텔 왕복 등) 하나로 정리한다.
  const stops: { ref: PlaceRef; coordinate?: { lat: number; lng: number } }[] = [];
  for (const activity of activities) {
    if (NON_PLACE_TYPES.has(activity.type)) continue;

    const ref = toPlaceRef(activity, destination);
    const prev = stops[stops.length - 1];
    const isSamePlace =
      prev &&
      (prev.ref.placeId && ref.placeId
        ? prev.ref.placeId === ref.placeId
        : prev.ref.query === ref.query);
    if (isSamePlace) continue;

    stops.push({ ref, coordinate: activity.coordinate });
  }

  if (stops.length === 0) {
    return singlePlaceUrls({ query: destination }, apiKey);
  }
  if (stops.length === 1) {
    return singlePlaceUrls(stops[0].ref, apiKey);
  }

  // Google Directions는 transit 모드에서 경유지를 지원하지 않아 경로가 깨진다.
  // 검증된 좌표로 최장 구간을 계산해 도보(근거리)/차량(원거리) 중에서 선택하되,
  // 자차·렌터카 여행자는 항상 차량 경로를 쓴다.
  let longestSegmentMeters = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i].coordinate;
    const to = stops[i + 1].coordinate;
    if (!from || !to) continue;
    longestSegmentMeters = Math.max(longestSegmentMeters, haversineMeters(from, to));
  }
  const mode =
    preferDriving || longestSegmentMeters > WALKING_MAX_SEGMENT_METERS ? 'driving' : 'walking';

  const origin = stops[0].ref;
  const dest = stops[stops.length - 1].ref;
  const middleStops = stops.slice(1, -1);

  const embedWaypoints = middleStops
    .map(({ ref }) => (ref.placeId ? `place_id:${ref.placeId}` : ref.query))
    .join('|');
  const embed =
    `https://www.google.com/maps/embed/v1/directions?key=${apiKey}` +
    `&origin=${embedParam(origin)}&destination=${embedParam(dest)}` +
    (middleStops.length > 0 ? `&waypoints=${encodeURIComponent(embedWaypoints)}` : '') +
    `&mode=${mode}`;

  const externalParams = new URLSearchParams({
    api: '1',
    origin: origin.query,
    destination: dest.query,
    travelmode: mode,
  });
  if (origin.placeId) externalParams.set('origin_place_id', origin.placeId);
  if (dest.placeId) externalParams.set('destination_place_id', dest.placeId);
  if (middleStops.length > 0) {
    externalParams.set('waypoints', middleStops.map(({ ref }) => ref.query).join('|'));
    // waypoint_place_ids는 waypoints와 개수·순서가 일치해야 하므로 전부 있을 때만 붙인다.
    if (middleStops.every(({ ref }) => ref.placeId)) {
      externalParams.set(
        'waypoint_place_ids',
        middleStops.map(({ ref }) => ref.placeId).join('|')
      );
    }
  }

  return {
    embed,
    external: `https://www.google.com/maps/dir/?${externalParams.toString()}`,
  };
}
