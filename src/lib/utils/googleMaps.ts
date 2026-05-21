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

const getGoogleMapsKey = () =>
  process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

const shouldValidateActivity = (type: string) =>
  !['flight', 'transport'].includes(type.toLowerCase());

export async function geocodePlace(query: string): Promise<ValidatedPlace> {
  const normalizedQuery = query.trim();
  const apiKey = getGoogleMapsKey();

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

    const data = (await response.json()) as GeocodeResponse;
    const result = data.results?.[0];
    const location = result?.geometry?.location;

    if (data.status !== 'OK' || !result || !location) {
      return { query: normalizedQuery, isValidated: false };
    }

    return {
      query: normalizedQuery,
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
    return { query: normalizedQuery, isValidated: false };
  }
}

async function estimateTravelSegment(origin: string, destination: string) {
  const apiKey = getGoogleMapsKey();

  if (!origin || !destination || !apiKey) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      origin,
      destination,
      mode: 'transit',
      key: apiKey,
      language: 'ko',
    });

    const response = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as DirectionsResponse;
    const leg = data.routes?.[0]?.legs?.[0];

    if (data.status !== 'OK' || !leg?.duration || !leg?.distance) {
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
