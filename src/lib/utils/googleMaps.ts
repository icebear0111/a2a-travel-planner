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

export async function geocodePlace(query: string): Promise<ValidatedPlace> {
  const normalizedQuery = query.trim();
  const apiKey = getGoogleMapsKey();
  const cacheKey = normalizedQuery.toLocaleLowerCase();
  const cachedPlace = readCache(geocodeCache, cacheKey);

  if (cachedPlace) {
    return cachedPlace;
  }

  if (!normalizedQuery || !apiKey) {
    return { query: normalizedQuery, isValidated: false };
  }

  try {
    const params = new URLSearchParams({
      address: normalizedQuery,
      key: apiKey,
      language: 'ko',
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);

    if (!response.ok) {
      return { query: normalizedQuery, isValidated: false };
    }

    const data = (await response.json()) as GeocodeResponse & { error_message?: string };
    const result = data.results?.[0];
    const location = result?.geometry?.location;

    if (data.status !== 'OK' || !result || !location) {
      warnApiStatusOnce('Geocoding', data.status, data.error_message);
      return { query: normalizedQuery, isValidated: false };
    }

    const place = {
      query: normalizedQuery,
      isValidated: true,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
      coordinate: {
        lat: location.lat,
        lng: location.lng,
      },
    };
    writeCache(geocodeCache, cacheKey, place);
    return place;
  } catch (error) {
    console.error('Google Maps geocode failed:', error);
    return { query: normalizedQuery, isValidated: false };
  }
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

async function estimateTravelSegment(origin: string, destination: string) {
  const apiKey = getGoogleMapsKey();
  const cacheKey = `${origin.trim().toLocaleLowerCase()}→${destination
    .trim()
    .toLocaleLowerCase()}`;
  const cachedSegment = readCache(directionsCache, cacheKey);

  if (cachedSegment) {
    return cachedSegment;
  }

  if (!origin || !destination || !apiKey) {
    return null;
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
  destination: string
): Promise<DayItinerary[]> {
  if (!getGoogleMapsKey()) {
    console.warn('Google Maps API key is missing. Skipping itinerary location validation.');
    return itinerary;
  }

  const validatedDays = await Promise.all(
    itinerary.map(async (day) => {
      const activities = await Promise.all(
        day.activities.map(async (activity) => {
          if (!shouldValidateActivity(activity.type)) {
            return activity;
          }

          const context = activity.location || destination;
          const place = await geocodePlace(`${activity.title}, ${context}`);

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

          const travelSegment = await estimateTravelSegment(activity.address, nextActivity.address);

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
