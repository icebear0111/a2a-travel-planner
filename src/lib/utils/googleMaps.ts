import type { DayItinerary } from '@/lib/agents/route';

export interface ValidatedPlace {
  query: string;
  isValidated: boolean;
  formattedAddress?: string;
  placeId?: string;
  coordinate?: { lat: number; lng: number };
}

interface GeocodeResult {
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
}

interface GeocodeResponse {
  status: string;
  results?: GeocodeResult[];
}

interface DirectionsLeg {
  duration?: {
    text: string;
    value: number;
  };
  distance?: {
    text: string;
    value: number;
  };
}

interface DirectionsResponse {
  status: string;
  routes?: {
    legs?: DirectionsLeg[];
  }[];
}

interface TravelSegment {
  travelTimeToNext: string;
  travelDistanceToNext: string;
  travelMinutesToNext: number;
  travelMetersToNext: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const MAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAP_CACHE_MAX_ENTRIES = 500;
const geocodeCache = new Map<string, CacheEntry<ValidatedPlace>>();
const directionsCache = new Map<string, CacheEntry<TravelSegment>>();

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  if (cache.size >= MAP_CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + MAP_CACHE_TTL_MS });
}

const getGoogleMapsKey = () =>
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

// REQUEST_DENIED(키 권한 없음) 같은 설정 오류는 조용히 실패하면 원인 파악이 어려우므로
// 상태 코드별로 한 번씩만 경고를 남긴다.
const reportedApiStatuses = new Set<string>();

function warnApiStatusOnce(api: string, status: string, errorMessage?: string) {
  const key = `${api}:${status}`;
  if (status === 'OK' || status === 'ZERO_RESULTS' || reportedApiStatuses.has(key)) return;
  reportedApiStatuses.add(key);
  console.warn(
    `⚠️ [Google Maps] ${api} 응답 상태 ${status}${errorMessage ? ` — ${errorMessage}` : ''}`
  );
}

const shouldValidateActivity = (type: string) =>
  !['flight', 'transport'].includes(type.toLowerCase());

interface PlacesSearchResponse {
  places?: {
    id?: string;
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
  }[];
  error?: { status?: string; message?: string };
}

// POI 검색 반경 (locationBias) — 도시권 커버, Places API 최대 허용값
const PLACES_BIAS_RADIUS_METERS = 50000;

// ============================================
// 실존 POI 후보 풀 — 일정 생성 전에 목적지의 검증된 인기 장소를 뽑아
// 프롬프트에 주입한다 (환각·폐업 장소 편성을 생성 단계에서 예방)
// ============================================

export interface PoiCandidate {
  name: string;
  rating?: number;
}

interface PoiSearchResponse {
  places?: {
    displayName?: { text?: string };
    rating?: number;
    userRatingCount?: number;
  }[];
  error?: { status?: string; message?: string };
}

const poiCache = new Map<string, CacheEntry<PoiCandidate[]>>();

// 컨셉별 검색 키워드 — 선택된 컨셉에 맞는 실존 장소를 후보에 포함시킨다
const CONCEPT_POI_QUERIES: Record<string, string> = {
  food: '유명 맛집',
  culture: '박물관 유적지',
  nature: '자연 명소 공원',
  shopping: '쇼핑 거리 시장',
};

async function searchPoiList(query: string, apiKey: string): Promise<PoiCandidate[]> {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'ko', pageSize: 12 }),
    });

    const data = (await response.json()) as PoiSearchResponse;
    if (!response.ok || data.error) {
      warnApiStatusOnce(
        'Places(poiCandidates)',
        data.error?.status || `HTTP ${response.status}`,
        data.error?.message
      );
      return [];
    }

    return (data.places || [])
      .filter(
        (place) =>
          place.displayName?.text &&
          // 리뷰가 어느 정도 쌓인 실존·운영 중 장소만 후보로 쓴다
          (place.userRatingCount ?? 0) >= 50 &&
          (place.rating ?? 0) >= 4.0
      )
      .map((place) => ({ name: place.displayName!.text!, rating: place.rating }));
  } catch (error) {
    console.error('Google Places POI search failed:', error);
    return [];
  }
}

/**
 * 목적지의 실존 인기 장소 후보를 수집한다 (관광 명소 + 선택 컨셉별 최대 2종).
 * 실패해도 빈 배열을 반환해 일정 생성을 막지 않는다.
 */
export async function fetchPoiCandidates(
  destination: string,
  conceptIds: string[] = []
): Promise<PoiCandidate[]> {
  const apiKey = getGoogleMapsKey();
  if (!destination.trim() || !apiKey) return [];

  const conceptQueries = conceptIds
    .map((id) => CONCEPT_POI_QUERIES[id])
    .filter((query): query is string => Boolean(query))
    .slice(0, 2);
  const queries = [`${destination} 인기 관광 명소`, ...conceptQueries.map((q) => `${destination} ${q}`)];

  const cacheKey = queries.join('|').toLocaleLowerCase();
  const cached = readCache(poiCache, cacheKey);
  if (cached) return cached;

  const results = await Promise.all(queries.map((query) => searchPoiList(query, apiKey)));

  // 이름 기준 중복 제거 후 평점순 상위만 유지 (프롬프트 크기 제한)
  const seen = new Set<string>();
  const candidates: PoiCandidate[] = [];
  for (const place of results.flat()) {
    const key = place.name.toLocaleLowerCase().replace(/\s/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(place);
  }
  candidates.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const top = candidates.slice(0, 24);

  writeCache(poiCache, cacheKey, top);
  console.log(`📍 [POI] ${destination} 실존 장소 후보 ${top.length}곳 확보`);
  return top;
}

// Places Text Search (New): 가게·명소 이름 같은 자연어 장소 검색에 강하다.
// biasCenter(목적지 좌표)를 주면 같은 이름의 다른 도시 장소로 튀는 것을 막는다.
async function searchPlaceByText(
  query: string,
  apiKey: string,
  biasCenter?: { lat: number; lng: number }
): Promise<ValidatedPlace | null> {
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.formattedAddress,places.location',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'ko',
        pageSize: 1,
        ...(biasCenter
          ? {
              locationBias: {
                circle: {
                  center: { latitude: biasCenter.lat, longitude: biasCenter.lng },
                  radius: PLACES_BIAS_RADIUS_METERS,
                },
              },
            }
          : {}),
      }),
    });

    const data = (await response.json()) as PlacesSearchResponse;

    if (!response.ok || data.error) {
      warnApiStatusOnce(
        'Places(searchText)',
        data.error?.status || `HTTP ${response.status}`,
        data.error?.message
      );
      return null;
    }

    const place = data.places?.[0];
    if (!place?.id || !place.location) {
      return null;
    }

    return {
      query,
      isValidated: true,
      formattedAddress: place.formattedAddress,
      placeId: place.id,
      coordinate: { lat: place.location.latitude, lng: place.location.longitude },
    };
  } catch (error) {
    console.error('Google Places text search failed:', error);
    return null;
  }
}

// Geocoding API: 주소·도시명 변환용 폴백 (POI 이름에는 약하다)
async function geocodeByAddress(query: string, apiKey: string): Promise<ValidatedPlace | null> {
  try {
    const params = new URLSearchParams({
      address: query,
      key: apiKey,
      language: 'ko',
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GeocodeResponse & { error_message?: string };
    const result = data.results?.[0];
    const location = result?.geometry?.location;

    if (data.status !== 'OK' || !result || !location) {
      warnApiStatusOnce('Geocoding', data.status, data.error_message);
      return null;
    }

    return {
      query,
      isValidated: true,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
      coordinate: {
        lat: location.lat,
        lng: location.lng,
      },
    };
  } catch (error) {
    console.error('Google Maps geocode failed:', error);
    return null;
  }
}

export async function geocodePlace(
  query: string,
  biasCenter?: { lat: number; lng: number }
): Promise<ValidatedPlace> {
  const normalizedQuery = query.trim();
  const apiKey = getGoogleMapsKey();
  // 같은 이름이라도 목적지(바이어스)가 다르면 다른 장소일 수 있으므로 캐시 키에 포함한다.
  const biasKey = biasCenter ? `@${biasCenter.lat.toFixed(1)},${biasCenter.lng.toFixed(1)}` : '';
  const cacheKey = `${normalizedQuery.toLocaleLowerCase()}${biasKey}`;
  const cachedPlace = readCache(geocodeCache, cacheKey);

  if (cachedPlace) {
    return cachedPlace;
  }

  if (!normalizedQuery || !apiKey) {
    return { query: normalizedQuery, isValidated: false };
  }

  // POI 이름에 강한 Places Text Search를 우선 시도하고,
  // 미활성/무결과 시 Geocoding으로 폴백한다.
  const place =
    (await searchPlaceByText(normalizedQuery, apiKey, biasCenter)) ||
    (await geocodeByAddress(normalizedQuery, apiKey));

  if (!place) {
    return { query: normalizedQuery, isValidated: false };
  }

  writeCache(geocodeCache, cacheKey, place);
  return place;
}

type DirectionsMode = 'transit' | 'walking' | 'driving';

async function fetchDirectionsSegment(
  origin: string,
  destination: string,
  mode: DirectionsMode,
  apiKey: string
): Promise<TravelSegment | null> {
  try {
    const params = new URLSearchParams({
      origin,
      destination,
      mode,
      key: apiKey,
      language: 'ko',
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as DirectionsResponse & { error_message?: string };
    const leg = data.routes?.[0]?.legs?.[0];

    if (data.status !== 'OK' || !leg?.duration || !leg?.distance) {
      warnApiStatusOnce(`Directions(${mode})`, data.status, data.error_message);
      return null;
    }

    return {
      travelTimeToNext: leg.duration.text,
      travelDistanceToNext: leg.distance.text,
      travelMinutesToNext: Math.round(leg.duration.value / 60),
      travelMetersToNext: leg.distance.value,
    };
  } catch (error) {
    console.error('Google Maps directions failed:', error);
    return null;
  }
}

// 도보로 이 시간을 넘기면 차량 경로가 더 현실적인 추정치다.
const WALKING_FALLBACK_MAX_MINUTES = 40;

async function estimateTravelSegment(
  origin: string,
  destination: string,
  preferDriving = false
) {
  const apiKey = getGoogleMapsKey();
  const cacheKey = `${preferDriving ? 'car:' : ''}${origin.trim().toLocaleLowerCase()}→${destination
    .trim()
    .toLocaleLowerCase()}`;
  const cachedSegment = readCache(directionsCache, cacheKey);

  if (cachedSegment) {
    return cachedSegment;
  }

  if (!origin || !destination || !apiKey) {
    return null;
  }

  // 자차·렌터카 여행자는 차량 경로를 우선 사용한다.
  if (preferDriving) {
    const driving = await fetchDirectionsSegment(origin, destination, 'driving', apiKey);
    if (driving) {
      writeCache(directionsCache, cacheKey, driving);
      return driving;
    }
  }

  // 키에 따라 transit 결과가 제공되지 않는 경우가 있어(ZERO_RESULTS)
  // 대중교통 → 도보 → 차량 순으로 폴백한다.
  const transit = await fetchDirectionsSegment(origin, destination, 'transit', apiKey);
  if (transit) {
    writeCache(directionsCache, cacheKey, transit);
    return transit;
  }

  const walking = await fetchDirectionsSegment(origin, destination, 'walking', apiKey);
  if (walking && walking.travelMinutesToNext <= WALKING_FALLBACK_MAX_MINUTES) {
    writeCache(directionsCache, cacheKey, walking);
    return walking;
  }

  const driving = await fetchDirectionsSegment(origin, destination, 'driving', apiKey);
  const segment = driving || walking;
  if (segment) {
    writeCache(directionsCache, cacheKey, segment);
  }
  return segment;
}

export async function validateItineraryLocations(
  itinerary: DayItinerary[],
  destination: string,
  options?: { preferDriving?: boolean }
): Promise<DayItinerary[]> {
  if (!getGoogleMapsKey()) {
    console.warn('Google Maps API key is missing. Skipping itinerary location validation.');
    return itinerary;
  }

  const preferDriving = options?.preferDriving ?? false;

  // 목적지 좌표를 먼저 구해 장소 검색의 locationBias로 사용한다.
  // (같은 이름의 다른 도시 장소로 매칭되는 것을 방지 — 캐시되므로 반복 비용 없음)
  const destinationPlace = await geocodePlace(destination);
  const biasCenter = destinationPlace.coordinate;

  const validatedDays = await Promise.all(
    itinerary.map(async (day) => {
      const activities = await Promise.all(
        day.activities.map(async (activity) => {
          if (!shouldValidateActivity(activity.type)) {
            return activity;
          }

          const context = activity.location || destination;
          const place = await geocodePlace(`${activity.title}, ${context}`, biasCenter);

          if (!place.isValidated) {
            return {
              ...activity,
              isPlaceValidated: false,
            };
          }

          return {
            ...activity,
            location: place.formattedAddress || activity.location,
            address: place.formattedAddress,
            coordinate: place.coordinate,
            placeId: place.placeId,
            isPlaceValidated: true,
          };
        })
      );

      const activitiesWithTravel = await Promise.all(
        activities.map(async (activity, index) => {
          const nextActivity = activities[index + 1];

          if (
            !nextActivity ||
            activity.type === 'flight' ||
            nextActivity.type === 'flight' ||
            !activity.address ||
            !nextActivity.address
          ) {
            return activity;
          }

          const travelSegment = await estimateTravelSegment(
            activity.address,
            nextActivity.address,
            preferDriving
          );

          if (!travelSegment) {
            return activity;
          }

          return {
            ...activity,
            ...travelSegment,
          };
        })
      );

      return { ...day, activities: activitiesWithTravel };
    })
  );

  console.log('✅ [Google Maps] 일정 장소 검증 완료');
  return validatedDays;
}
