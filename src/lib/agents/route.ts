import OpenAI from 'openai';
import { Intent } from './intent';
import { FlightContext } from './flight';
import { HotelContext } from './hotel';
import { BUDGET_LIMITS } from './budget';
import {
  CONTENT_CONCEPT_IDS,
  DRIVE_TRIP_PROMPT,
  formatTravelStyleForPrompt,
} from '@/lib/utils/travelStyle';
import type { PoiCandidate } from '@/lib/utils/googleMaps';

export interface AgentSuggestion {
  target: 'HOTEL' | 'ROUTE';
  reason: string;
}

export interface Activity {
  id: string;
  title: string;
  type: string;
  price: number;
  desc: string;
  duration: string;
  time: string;
  location: string;
  address?: string;
  placeId?: string;
  coordinate?: { lat: number; lng: number };
  isPlaceValidated?: boolean;
  travelTimeToNext?: string;
  travelDistanceToNext?: string;
  travelMinutesToNext?: number;
  travelMetersToNext?: number;
}

export interface DayItinerary {
  day: number;
  activities: Activity[];
}

/** 여행 골격 — 날짜별로 배정된 지역과 하루의 초점 */
export interface DayPlan {
  day: number;
  area: string;
  focus: string;
}

export interface DayGenerationOptions {
  assignedMustVisit?: string[];
  suggestion?: AgentSuggestion;
  otherDaysMustVisit?: string[];
  /** 골격 에이전트가 배정한 오늘의 지역 (날짜 간 중복 편성 원천 방지) */
  dayPlan?: DayPlan;
  /** Google Places로 확인된 실존 인기 장소 후보 (환각 예방) */
  poiCandidates?: PoiCandidate[];
}

// 생성 시에만 쓰는 내부 필드(conceptTag)를 포함한 활동 타입 — 반환 전에 제거한다
type GeneratedActivity = Activity & { conceptTag?: string };

const LOGISTICS_TYPES = new Set(['flight', 'transport', 'hotel']);

const ACTIVITY_TYPE_VALUES = [
  'flight',
  'transport',
  'hotel',
  'sightseeing',
  'food',
  'shopping',
  'coffee',
  'theme',
  'etc',
];

// Structured Outputs(strict) 스키마 — 타입 enum·시간 형식·필드 누락을 API 레벨에서 강제해
// 실행 간 응답 형식이 흔들리지 않게 한다.
function buildDayResponseFormat(conceptTagValues: string[]) {
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'day_itinerary',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['activities'],
        properties: {
          activities: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'id',
                'time',
                'duration',
                'type',
                'title',
                'location',
                'desc',
                'price',
                'conceptTag',
              ],
              properties: {
                id: { type: 'string' },
                time: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' },
                duration: {
                  type: 'string',
                  description: '"Xh Ym" 또는 "Xm" 형식 (예: "1h 30m", "45m")',
                },
                type: { type: 'string', enum: ACTIVITY_TYPE_VALUES },
                title: { type: 'string' },
                location: { type: 'string' },
                desc: { type: 'string' },
                price: { type: 'number' },
                conceptTag: { type: 'string', enum: conceptTagValues },
              },
            },
          },
        },
      },
    },
  };
}

// 선택된 내용형 컨셉이 실제 활동에 얼마나 반영됐는지 (0~1)
function conceptCoverage(activities: GeneratedActivity[], contentConcepts: string[]) {
  if (contentConcepts.length === 0) return 1;
  const contentActivities = activities.filter((activity) => !LOGISTICS_TYPES.has(activity.type));
  if (contentActivities.length === 0) return 1;
  const matched = contentActivities.filter(
    (activity) => activity.conceptTag && contentConcepts.includes(activity.conceptTag)
  );
  return matched.length / contentActivities.length;
}

// 시간순 정렬·id 재부여·내부 필드 제거 — 프롬프트가 보장 못 하는 통일성은 코드로 확정한다
function normalizeDayActivities(
  dayNumber: number,
  activities: GeneratedActivity[]
): Activity[] {
  const sorted = [...activities].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  return sorted.map((activity, index) => {
    const rest: GeneratedActivity = { ...activity, id: `d${dayNumber}-${index + 1}` };
    delete rest.conceptTag;
    return rest;
  });
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 여행 골격(skeleton) 에이전트 — 날짜별 지역 사전 배정
// ============================================
// 날짜별 병렬 생성은 각 날이 서로를 모르는 게 약점이다. 생성 전에 싼 호출 1번으로
// "Day 1: 신주쿠권 / Day 2: 아사쿠사·우에노권"처럼 지역을 배정해 두면
// 중복 편성이 원천 차단되고 여행 전체가 하나의 설계로 읽힌다.
// Transport·Hotel 에이전트와 병렬로 실행되므로 체감 지연이 없다.
export async function planTripSkeleton(
  intent: Intent,
  mustVisitAssignment: Map<number, string[]>
): Promise<Map<number, DayPlan> | null> {
  if (intent.duration < 2) return null;

  const mustVisitLines = [...mustVisitAssignment.entries()]
    .map(([day, places]) => `- Day ${day}: ${places.join(', ')}`)
    .join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      reasoning_effort: 'none',
      temperature: 0.4,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'trip_skeleton',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['days'],
            properties: {
              days: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['day', 'area', 'focus'],
                  properties: {
                    day: { type: 'integer' },
                    area: { type: 'string' },
                    focus: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      messages: [
        {
          role: 'system',
          content: `You are a trip architect. Split a ${intent.duration}-day trip to ${intent.destination} into day-by-day geographic areas so each day stays in ONE compact area and no two days overlap.

Rules:
- Day 1 is the arrival day and Day ${intent.duration} is the departure day: assign them lighter areas near the city center or the arrival/departure hub.
- If a day has assigned must-visit places, that day's area MUST contain them.
- "area": specific real district/neighborhood names (예: "우에노·아사쿠사 일대", "경포호·강문 해변 일대").
- "focus": ONE short Korean sentence describing the day's theme, reflecting the travel concepts.
- Output exactly ${intent.duration} days, in KOREAN.`,
        },
        {
          role: 'user',
          content: `Destination: ${intent.destination}
Duration: ${intent.duration} days
Travel concepts: ${intent.travelStyle?.join(', ') || 'balanced'}
Themes: ${intent.themes.join(', ')}
Must-visit assignments:
${mustVisitLines || '- None'}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as { days: DayPlan[] };
    const plans = new Map<number, DayPlan>();
    for (const plan of parsed.days || []) {
      if (plan.day >= 1 && plan.day <= intent.duration && plan.area) {
        plans.set(plan.day, plan);
      }
    }
    if (plans.size !== intent.duration) return null;

    console.log(
      `🧭 [4-Route] 여행 골격: ${[...plans.values()].map((p) => `D${p.day} ${p.area}`).join(' / ')}`
    );
    return plans;
  } catch (error) {
    console.error('❌ [4-Route] 골격 생성 실패 (지역 배정 없이 진행):', error);
    return null;
  }
}

// ============================================
// 꼭 가고 싶은 장소(must-visit)의 날짜 사전 배정
// ============================================
// 날짜별 일정이 병렬로 생성되어 서로의 내용을 모르기 때문에, 같은 장소가
// 여러 날에 중복 편성되는 문제가 있었다. 생성 전에 장소마다 담당 날짜를
// 확정해 "그 날에만 포함"하도록 강제한다.
export function assignMustVisitPlaces(
  mustVisitPlaces: string[] | undefined,
  totalDays: number
): Map<number, string[]> {
  const assignment = new Map<number, string[]>();
  const places = (mustVisitPlaces || []).map((place) => place.trim()).filter(Boolean);
  if (places.length === 0) return assignment;

  // 도착일(1일차)·출발일(마지막 날)은 이동으로 시간이 짧으므로 중간 날짜에 우선 배정한다.
  const middleDays = Array.from({ length: Math.max(0, totalDays - 2) }, (_, i) => i + 2);
  const candidateDays = middleDays.length > 0 ? middleDays : [1];

  places.forEach((place, index) => {
    const day = candidateDays[index % candidateDays.length];
    assignment.set(day, [...(assignment.get(day) || []), place]);
  });

  return assignment;
}

// 해당 일차의 실제 달력 날짜·요일을 구한다 — 요일(휴관일·혼잡도)과 계절을 프롬프트에 반영하기 위함.
// startDate("YYYY-MM-DD")는 UTC 자정으로 파싱되므로 요일도 UTC 기준으로 읽어야 서버 타임존과 무관하게 정확하다.
function resolveDayDate(startDate: string, dayNumber: number) {
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + (dayNumber - 1));

  const month = date.getUTCMonth() + 1;
  const season = month >= 3 && month <= 5 ? '봄' : month >= 6 && month <= 8 ? '여름' : month >= 9 && month <= 11 ? '가을' : '겨울';
  const weekday = date.toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'UTC' });

  return { label: `${date.toISOString().split('T')[0]} (${weekday})`, season, weekday };
}

// 같은 장소의 표현 변형("경포해변 산책" vs "경포해변 야경 산책")을 같은 키로 접기 위해
// 활동성 접미어를 제거한다 — 장소명 자체가 아니라 행위 서술이므로 중복 판정에서 무시해야 한다.
const ACTIVITY_SUFFIX_PATTERN = /(산책|관람|방문|야경|투어|감상|나들이|구경|체험|휴식)/g;

const normalizePlaceKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(ACTIVITY_SUFFIX_PATTERN, '');

const matchesPlace = (title: string, place: string) => {
  const normalizedTitle = normalizePlaceKey(title);
  const normalizedPlace = normalizePlaceKey(place);
  if (!normalizedTitle || !normalizedPlace) return false;
  return normalizedTitle.includes(normalizedPlace) || normalizedPlace.includes(normalizedTitle);
};

// 다른 날짜에 배정된 must-visit이 이 날짜에 끼어들면 제거한다 (프롬프트 무시 대비 안전망)
export function removeForeignMustVisits(
  day: DayItinerary,
  foreignPlaces: string[]
): DayItinerary {
  if (foreignPlaces.length === 0) return day;

  return {
    ...day,
    activities: day.activities.filter(
      (activity) => !foreignPlaces.some((place) => matchesPlace(activity.title, place))
    ),
  };
}

// 여러 날에 같은 관광지·카페가 반복 편성되면 첫 등장만 남긴다
// (food는 제외 — 중복 제거 시 그날 식사가 통째로 비어 더 큰 품질 문제가 된다)
const CROSS_DAY_DEDUPE_TYPES = new Set(['sightseeing', 'theme', 'coffee']);
// 포함 관계 매칭 시 짧은 키("공원 산책" 등)의 오탐을 막기 위한 최소 길이
const MIN_CONTAINMENT_KEY_LENGTH = 6;

export function dedupeRepeatedPlaces(itinerary: DayItinerary[]): DayItinerary[] {
  const seenPlaceKeys = new Set<string>();

  const isDuplicate = (key: string) => {
    if (seenPlaceKeys.has(key)) return true;
    // "월정사 전나무숲길 산책" vs "오대산 월정사 전나무숲길 산책"처럼
    // 표현만 다른 같은 장소를 포함 관계로 잡는다.
    for (const seen of seenPlaceKeys) {
      const shorterLength = Math.min(seen.length, key.length);
      if (shorterLength < MIN_CONTAINMENT_KEY_LENGTH) continue;
      if (seen.includes(key) || key.includes(seen)) return true;
    }
    return false;
  };

  return itinerary.map((day) => ({
    ...day,
    activities: day.activities.filter((activity) => {
      if (!CROSS_DAY_DEDUPE_TYPES.has(activity.type)) return true;

      const key = normalizePlaceKey(activity.title);
      if (!key) return true;
      if (isDuplicate(key)) return false;
      seenPlaceKeys.add(key);
      return true;
    }),
  }));
}

// ============================================
// 단일 날짜 일정 생성 (병렬 호출용)
// ============================================
export async function generateDayItinerary(
  dayNumber: number,
  totalDays: number,
  intent: Intent,
  flight: FlightContext,
  hotel: HotelContext,
  options: DayGenerationOptions = {}
): Promise<DayItinerary> {
  const { assignedMustVisit, suggestion, otherDaysMustVisit, dayPlan } = options;
  const isFirstDay = dayNumber === 1;
  const isLastDay = dayNumber === totalDays;

  // POI 후보를 날짜별로 분할 배정한다 — 전 날짜가 같은 목록을 받으면
  // 병렬 생성 특성상 같은 유명 식당·카페가 여러 날에 반복 편성된다.
  // 다른 날 몫은 명시적 금지 목록으로 넘겨 모델 기억에 의한 반복도 차단한다.
  const poiCandidates = (options.poiCandidates || []).filter(
    (_, index) => index % totalDays === dayNumber - 1
  );
  const poisReservedForOtherDays = (options.poiCandidates || [])
    .filter((_, index) => index % totalDays !== dayNumber - 1)
    .map((poi) => poi.name);
  const stylePrompt = formatTravelStyleForPrompt(intent);
  const dayDate = resolveDayDate(intent.startDate, dayNumber);
  const dailyActivityBudget = (BUDGET_LIMITS[intent.budgetLevel] || BUDGET_LIMITS.MEDIUM)
    .activityPerDay;

  // 내용형 컨셉(맛집·문화·자연·쇼핑)만 활동 단위 태깅·검증 대상이다
  const contentConcepts = (intent.travelStyle || []).filter((id) =>
    (CONTENT_CONCEPT_IDS as readonly string[]).includes(id)
  );
  const conceptTagValues =
    contentConcepts.length > 0 ? [...contentConcepts, 'other', 'logistics'] : ['general', 'logistics'];

  const travelMode = flight.mode || 'flight';
  const isDomestic = Boolean(intent.isDomestic);
  // 항공·기차·버스로 이동하면서 현지에서 렌터카를 쓰는 경우
  const needsRentalCar = Boolean(intent.useRentalCar) && travelMode !== 'car';
  // 자차든 렌터카든, 현지 이동이 차량 중심인 여행
  const isDriveTrip = travelMode === 'car' || needsRentalCar;
  const driveInstruction = isDriveTrip
    ? `

[DRIVING TRIP]
- ${DRIVE_TRIP_PROMPT}`
    : '';
  const rentalPickupInstruction = needsRentalCar
    ? `
            - **After arrival, add a RENTAL CAR PICKUP activity.** Type: 'transport', Duration: 30m, Title: "렌터카 픽업".`
    : '';
  const rentalReturnInstruction = needsRentalCar
    ? `
- **Add a "렌터카 반납" activity (Type: 'transport', 30m) before the final departure.**`
    : '';

  // 날짜별 특수 지시사항
  let daySpecificInstructions = '';

  if (isFirstDay) {
    if (travelMode === 'car') {
      daySpecificInstructions = `
            [CRITICAL - DAY 1 LOGISTICS (ROAD TRIP START)]
            - **Activity #1 MUST be the DRIVE to ${intent.destination}.**
              - Time: ${flight.departureTime} (User Input)
              - Duration: ${flight.flightDuration} (rest stop included)
              - Type: 'transport'
              - Title: "자차 출발: ${flight.originAirportCode} → ${intent.destination}"
              - Desc: "휴게소 1회, 약 ${flight.flightDuration}"
            - **NO airport, NO flight, NO immigration activities — this is a domestic road trip.**
            - After arriving, CHECK-IN at "${hotel.name}" (Type: 'hotel') when time allows
              (or one light stop near the hotel first, then check-in).
            - Then schedule light activities near the hotel,
              and ALWAYS include dinner (저녁) at a real local restaurant before the day ends.`;
    } else if (travelMode === 'train' || travelMode === 'bus') {
      daySpecificInstructions = `
            [CRITICAL - DAY 1 LOGISTICS (${travelMode === 'train' ? 'TRAIN' : 'BUS'} TRIP START)]
            - **Activity #1 MUST be the ${travelMode === 'train' ? 'TRAIN' : 'BUS'} RIDE.**
              - Time: ${flight.departureTime} (User Input)
              - Duration: ${flight.flightDuration}
              - Type: 'transport'
              - Title: "${flight.airline} 탑승: ${flight.originAirportCode} → ${flight.destAirportCode}"
            - **NO airport, NO flight, NO immigration activities.**${rentalPickupInstruction}
            - **Then MOVE TO HOTEL "${hotel.name}"** (Type: 'transport') **and CHECK-IN** (Type: 'hotel').
            - After check-in, schedule light activities near the hotel,
              and ALWAYS include dinner (저녁) at a real local restaurant before the day ends.`;
    } else if (isDomestic) {
      daySpecificInstructions = `
            [CRITICAL - DAY 1 LOGISTICS (DOMESTIC FLIGHT START)]
            - **Activity #1 MUST be the DOMESTIC FLIGHT.**
              - Time: ${flight.departureTime} (User Input)
              - Duration: ${flight.flightDuration}
              - Type: 'flight'
              - Title: "국내선 출발: ${intent.destination}행 (${flight.originAirportCode} → ${flight.destAirportCode})"
            - **Activity #2: 공항 도착 및 수하물 수령.** Duration: 30m ~ 40m (domestic flight — **NO immigration**).
              - Title: "${flight.destAirportCode} 공항 도착"${rentalPickupInstruction}
            - **Then MOVE TO HOTEL "${hotel.name}"** (Type: 'transport') **and CHECK-IN** (Type: 'hotel').
            - After check-in, schedule light activities near the hotel (considering arrival fatigue),
              and ALWAYS include dinner (저녁) at a real local restaurant before the day ends.`;
    } else {
      daySpecificInstructions = `
            [CRITICAL - DAY 1 LOGISTICS (FLIGHT START)]
            - **Activity #1 MUST be the FLIGHT DEPARTURE from Origin.**
              - Time: ${flight.departureTime} (User Input)
              - Duration: ${flight.flightDuration}
              - Type: 'flight'
              - Title: "출국: ${intent.destination}행 비행기 탑승"
              - Desc: "출발: ${flight.originAirportCode}, 소요시간: ${flight.flightDuration}"

            - **Activity #2 MUST be ARRIVAL & IMMIGRATION.**
              - Time: Calculate based on (Start Time + Duration).
              - Duration: 1h ~ 1.5h (Immigration & Baggage Claim).
              - Title: "${intent.destination} 공항(${flight.destAirportCode}) 도착 및 입국 수속"

            - **Activity #3 MUST be MOVE TO HOTEL.**
              - Destination: ${hotel.name}
              - Type: 'transport'

            - **Activity #4 MUST be CHECK-IN.**
              - Type: 'hotel'
  - Title: "${hotel.name} 체크인"

- After check-in, schedule light activities near the hotel (considering arrival fatigue),
              and ALWAYS include dinner (저녁) at a real local restaurant before the day ends.`;
    }
  } else if (isLastDay) {
    if (travelMode === 'car') {
      daySpecificInstructions = `
            [CRITICAL - LAST DAY LOGISTICS (ROAD TRIP END)]
- **The traveler is ALREADY in ${intent.destination} (arrived on Day 1). NEVER include an inbound ${flight.originAirportCode} → ${intent.destination} drive today — the ONLY long drive today is the DRIVE HOME at the end.**
- **Activity #1 MUST be hotel checkout (Type: 'hotel', around 09:00, 30m) — luggage goes in the car.**
- Schedule light activities on the way, then head home.
            - **Final Activity MUST be the DRIVE HOME.**
              - Time: ${flight.returnTime}
              - Type: 'transport'
  - Title: "귀가 출발: ${intent.destination} → ${flight.originAirportCode}"`;
    } else if (travelMode === 'train' || travelMode === 'bus') {
      const stationWord = travelMode === 'train' ? '역' : '터미널';
      daySpecificInstructions = `
            [CRITICAL - LAST DAY LOGISTICS (${travelMode === 'train' ? 'TRAIN' : 'BUS'} TRIP END)]
- **The traveler is ALREADY in ${intent.destination} (arrived on Day 1). NEVER include an inbound ${flight.originAirportCode} → ${flight.destAirportCode} leg today — the ONLY long-distance ride today is the RETURN trip at the end.**
- **Activity #1 MUST be hotel checkout & luggage storage (Type: 'hotel', around 09:00, 30m).**
- Schedule light activities near the ${stationWord} area.${rentalReturnInstruction}
- **Schedule "${stationWord}으로 이동" about 40 minutes before the departure time.**
            - **Final Activity MUST be the RETURN ${travelMode === 'train' ? 'TRAIN' : 'BUS'}.**
              - Time: ${flight.returnTime}
              - Type: 'transport'
  - Title: "${flight.airline} 귀경: ${flight.destAirportCode} → ${flight.originAirportCode}"`;
    } else if (isDomestic) {
      daySpecificInstructions = `
            [CRITICAL - LAST DAY LOGISTICS (DOMESTIC FLIGHT END)]
- **The traveler is ALREADY in ${intent.destination} (arrived on Day 1). NEVER include an inbound ${flight.originAirportCode} → ${flight.destAirportCode} flight today — the ONLY flight today is the RETURN flight at the end.**
- **Activity #1 MUST be hotel checkout & luggage storage (Type: 'hotel', around 09:00, 30m).**
- Schedule light activities near the airport or central area.${rentalReturnInstruction}
- **Schedule "Travel to Airport" 1 hour before the flight time (domestic — short check-in).**
            - **Final Activity MUST be the DOMESTIC FLIGHT HOME.**
              - Time: ${flight.returnTime}
              - Type: 'flight'
  - Title: "귀가: ${flight.destAirportCode} 국내선 출발"`;
    } else {
      daySpecificInstructions = `
            [CRITICAL - LAST DAY LOGISTICS]
- **The traveler is ALREADY in ${intent.destination}. The ONLY flight today is the RETURN flight at ${flight.returnTime}, and it MUST be the LAST activity of the day. NEVER place a flight at the start of the day and NEVER reuse the outbound time ${flight.departureTime}.**
- **Activity #1 MUST be hotel checkout & luggage storage (Type: 'hotel', around 09:00, 30m).**
- Schedule light activities near the airport or central area, ending in time for the airport transfer.
- **Schedule "공항으로 이동" (Type: 'transport') 2.5 hours before the return flight time.**
            - **Final Activity MUST be FLIGHT DEPARTURE from Destination.**
              - Time: ${flight.returnTime}
              - Type: 'flight'
  - Title: "귀국: 공항 출발 (${flight.destAirportCode})"`;
    }
  } else {
    daySpecificInstructions = `
[FULL DAY - MIDDLE DAY]
- **Start**: Around 10:00 from hotel.
- **Lunch**: 12:30 ~ 13:30.
- **Dinner**: 18:30 ~ 20:00.
- **Night**: Suggest ONE activity after dinner before returning to hotel (~22:00).
- Allow 1.5h ~ 2h per major spot. Don't cram too many spots.`;
  }

  const budgetAdjustmentInstruction =
    suggestion?.target === 'ROUTE'
      ? `
[BUDGET ADJUSTMENT REQUIRED]
- Reason: ${suggestion.reason}
- Prefer free or low-cost attractions, public transit, casual local restaurants, and fewer paid tickets.
- Keep must-visit places if possible, but reduce optional shopping/theme/nightlife costs.
- Prices must be realistic KRW estimates after the cost reduction.`
      : '';

  const requestDay = async (emphasis = ''): Promise<GeneratedActivity[]> => {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      // 일정 생성은 추론보다 생성 위주 작업이라 추론을 생략해 지연시간을 최소화한다.
      // (gpt-5.4-mini 실측: low는 추론 토큰이 추가되어 오히려 2~3초 느려짐)
      reasoning_effort: 'none',
      // 실행 간 형식·구성 편차를 줄인다 (통일성)
      temperature: 0.4,
      response_format: buildDayResponseFormat(conceptTagValues),
      messages: [
      {
        role: 'system',
        content: `
You are a senior travel planner who designs realistic, on-the-ground daily itineraries that travelers can actually follow.
Create the itinerary for **Day ${dayNumber} of ${totalDays}** in ${intent.destination}.${
          dayDate
            ? `
This day is **${dayDate.label}**, in ${dayDate.season} season.`
            : ''
        }

[MANDATORY FORMAT]
1. Response strictly JSON (structure at the end).
2. LANGUAGE: **KOREAN** (Title & Desc).
3. Types: 'flight', 'transport', 'hotel', 'sightseeing', 'food', 'shopping', 'coffee', 'theme', 'etc'.
   Meals = 'food', cafes/desserts = 'coffee'. Pick the closest type.
4. **Price**: realistic per-person KRW as of 2026. Use 0 for free places. 'food' price = expected meal cost per person.
5. **Location**: Specific City or Area name for Google Maps search (국내: "속초, 강원도" / 해외: "Umeda, Osaka").
6. For the last plan of each day, when returning to the hotel, don't use the word "귀환". Use "호텔 이동: ${hotel.name}" instead.
7. **Desc**: ONE short Korean sentence — what makes this stop worth it plus one practical tip
   (대표 메뉴, 예약 필요 여부, 휴무 요일, 덜 붐비는 시간대, 야경 포인트 등). No generic filler.
8. **id format**: "d${dayNumber}-[sequence]" (e.g., "d${dayNumber}-1", "d${dayNumber}-2", ...)
9. **conceptTag**: the single selected travel concept this stop mainly serves.
   Allowed values: ${conceptTagValues.map((v) => `"${v}"`).join(', ')} — transport/hotel/flight legs are always "logistics".
10. **Title conventions**: 식사 "아침/점심/저녁: {식당 실명}" · 카페 "카페: {카페 실명}" · 이동 "이동: {출발} → {도착}".

[FORMAT EXAMPLE — copy the STYLE (title convention, desc tone, duration format), NEVER these places]
{"id":"d2-2","time":"10:30","duration":"1h 30m","type":"sightseeing","title":"메이지 신궁 산책","location":"Harajuku, Tokyo","desc":"도심 속 숲길이 이어져 아침 산책에 좋고, 남문 쪽 입구가 덜 붐빕니다.","price":0,"conceptTag":"${conceptTagValues[0]}"}
{"id":"d2-3","time":"12:30","duration":"1h 15m","type":"food","title":"점심: 아후리 하라주쿠점","location":"Harajuku, Tokyo","desc":"유자 소금 라멘이 대표 메뉴로, 12시 이전에 도착하면 대기가 짧습니다.","price":15000,"conceptTag":"${
          contentConcepts.includes('food') ? 'food' : conceptTagValues[0]
        }"}

[REALITY CHECK - VERY IMPORTANT]
- Only include REAL places that exist and are currently operating. NEVER invent a place name.
- Respect opening hours and closure days${dayDate ? ` for a ${dayDate.weekday} visit` : ''}
  (many museums/palaces close on Mondays, some markets close on specific weekdays — pick alternatives if closed).
- Times must be chronological with NO overlaps; durations realistic (major spot 1.5h~2h, meal 1h~1.5h)
  and leave sensible gaps for moving between places.
- **Meal labels must match their time**: 아침 07:00~10:00, 점심 11:30~14:00, 저녁 17:30~20:30.
  If the schedule misses a meal window (e.g., afternoon arrival), SKIP that meal — never mislabel it.
  Every meal window the traveler spends ON-SITE must include a meal (an arrival at 15:00 still gets dinner).
- **transport titles**: the origin must be the PREVIOUS stop of the day ("이동: {직전 장소} → {다음 장소}").
- Famous restaurants/cafes appear at most ONCE in the whole trip: if a well-known spot is NOT in today's
  verified list below, assume another day uses it and pick a different real place.${
    dayDate
      ? `
- Fit the ${dayDate.season} season: in summer avoid long midday outdoor walks, in winter keep outdoor stops short
  and prefer indoor alternatives; use seasonal highlights (벚꽃, 단풍, 눈 축제 등) when the timing matches.`
      : ''
  }
- Budget level is ${intent.budgetLevel}: keep the sum of today's activity/food/transport prices
  (excluding flight & hotel) around ${dailyActivityBudget.toLocaleString()} KRW or less.

            [CRITICAL - GEOGRAPHIC CLUSTERING]
            - **ONE DAY = ONE AREA**: Minimize travel time. Do NOT zig-zag across the city.${
              dayPlan
                ? `
            - **TODAY'S ASSIGNED AREA: ${dayPlan.area}** — 오늘의 초점: ${dayPlan.focus}
              Every stop today MUST be inside or immediately adjacent to this area. Other days cover
              the other areas of ${intent.destination}, so a famous spot in a DIFFERENT district is
              FORBIDDEN today even if it is popular or appears in the verified place list.`
                : ''
            }
            - **Basecamp Strategy**: User is staying at **"${hotel.name}"**.
              - Morning: Start from Hotel.
              - Evening: Loop back towards the Hotel area.
            - **NO REPEATS ACROSS DAYS**: This is one day of a ${totalDays}-day trip planned in parallel.
              Never schedule an attraction reserved for another day (listed below), and pick spots
              distinctive to today's area so days don't overlap.

${daySpecificInstructions}

${budgetAdjustmentInstruction}

${stylePrompt}${driveInstruction}

            REQUIRED JSON STRUCTURE:
            {
                  "activities": [
                    {
      "id": "d${dayNumber}-1",
                      "time": "HH:MM",
                      "duration": "1h 30m",
      "type": "sightseeing",
                      "title": "...",
                      "location": "...",
                      "desc": "...",
                      "price": 0,
                      "conceptTag": "${conceptTagValues[0]}"
                }
              ]
            }
          `,
      },
      {
        role: 'user',
        content: `
            User Request Overview:
            - Destination: ${intent.destination}
- Day: ${dayNumber} of ${totalDays}${dayDate ? ` — ${dayDate.label}` : ''}
            - Themes: ${intent.themes.join(', ')}
            - Travel Concept: ${intent.travelStyle?.join(', ') || 'balanced'}
            - Budget Level: ${intent.budgetLevel} (daily activity budget ≈ ${dailyActivityBudget.toLocaleString()} KRW)

            Basecamp (Hotel):
            - Name: ${hotel.name}
            - Location Hint: ${hotel.address}

            Transport Data (mode: ${travelMode}${isDomestic ? ', DOMESTIC trip within Korea' : ''}):
- Route: ${flight.originAirportCode} → ${flight.destAirportCode} (${flight.airline})
- Outbound Departure: ${flight.departureTime} / Return Departure: ${flight.returnTime}
            - Travel Duration: ${flight.flightDuration}
${needsRentalCar ? '- The traveler picks up a rental car on arrival and returns it before departure. Plan drive-based days.' : ''}

${
  poiCandidates && poiCandidates.length > 0
    ? `Verified REAL places in ${intent.destination} (Google Maps 확인, 평점순). 오늘 지역·컨셉에 맞는 것만 골라 우선 사용하라 — 이 목록에는 다른 날 지역의 장소도 섞여 있으므로, 오늘 지역 밖 장소는 목록에 있어도 절대 사용 금지. 목록 외 장소는 실존하는 곳만 추가:
${poiCandidates.map((p) => `- ${p.name}${p.rating ? ` (⭐${p.rating})` : ''}`).join('\n')}
`
    : ''
}
Must-Visit Places assigned to THIS DAY (USER PRIORITY):
${
  assignedMustVisit && assignedMustVisit.length > 0
    ? assignedMustVisit.map((p) => `- ${p}`).join('\n')
    : '- None'
}

Must-visit places reserved for OTHER days of this trip (STRICTLY FORBIDDEN today):
${
  otherDaysMustVisit && otherDaysMustVisit.length > 0
    ? otherDaysMustVisit.map((p) => `- ${p}`).join('\n')
    : '- None'
}
${
  poisReservedForOtherDays.length > 0
    ? `
Famous places reserved for OTHER days of this trip (FORBIDDEN today — every place appears at most once in the whole trip, pick real alternatives instead):
${poisReservedForOtherDays.map((name) => `- ${name}`).join('\n')}`
    : ''
}

            Instruction:
Create a well-structured Day ${dayNumber} itinerary. Cluster activities by location and keep every stop real and open on this weekday.
Follow the user travel concept above as the main planning rule — it decides the day's pace and what kinds of stops to prioritize.
${
  assignedMustVisit && assignedMustVisit.length > 0
    ? '**IMPORTANT**: Today MUST include every place assigned to this day. Build the day\'s route around them and allocate enough time (a theme park deserves most of the day).'
    : ''
}
${
  otherDaysMustVisit && otherDaysMustVisit.length > 0
    ? '**NEVER** schedule the places reserved for other days — each must-visit place appears EXACTLY ONCE in the whole trip, on its assigned day only.'
    : ''
}
${
  suggestion?.target === 'ROUTE'
    ? '**BUDGET MODE**: Lower the total activity cost for this day while keeping the trip coherent.'
    : ''
}
${emphasis}
          `,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error(`No content for day ${dayNumber}`);

    const result = JSON.parse(content) as { activities?: GeneratedActivity[] };
    return result.activities || [];
  };

  let activities = await requestDay();

  // 선택 컨셉이 활동에 충분히 반영됐는지 태그 분포로 검증 — 부족하면 1회 재생성
  if (contentConcepts.length > 0) {
    const coverage = conceptCoverage(activities, contentConcepts);
    if (coverage < 0.5) {
      console.log(
        `🔁 [4-Route] Day ${dayNumber} 컨셉 반영 부족 (${Math.round(coverage * 100)}%) → 재생성`
      );
      try {
        const retried = await requestDay(
          `**CONCEPT FIX REQUIRED**: The previous attempt did not reflect the selected concepts (${contentConcepts.join(
            ', '
          )}) enough. Rebuild the day so MOST non-transport stops directly serve these concepts, following each concept's quota above.`
        );
        if (conceptCoverage(retried, contentConcepts) > coverage) {
          activities = retried;
        }
      } catch (error) {
        console.error(`❌ [4-Route] Day ${dayNumber} 컨셉 재생성 실패 (첫 결과 유지):`, error);
      }
    }
  }

  return {
    day: dayNumber,
    activities: normalizeDayActivities(dayNumber, activities),
  };
}

// ============================================
// 메인 함수: 병렬로 모든 날짜 생성
// ============================================
export async function generateItinerary(
  intent: Intent,
  flight: FlightContext,
  hotel: HotelContext,
  suggestion?: AgentSuggestion,
  mustVisitPlaces?: string[],
  extras?: { dayPlans?: Map<number, DayPlan> | null; poiCandidates?: PoiCandidate[] }
): Promise<DayItinerary[]> {
  console.log(`🗺️ [4-Route] ${intent.destination} ${intent.duration}일 일정 병렬 생성 시작...`);

  if (suggestion) {
    console.log(`📝 [4-Route] 수정 요청: ${suggestion.reason}`);
  }

  if (mustVisitPlaces && mustVisitPlaces.length > 0) {
    console.log(`📍 [4-Route] 꼭 가고 싶은 장소: ${mustVisitPlaces.join(', ')}`);
  }

  try {
    // 중복 편성 방지: must-visit을 날짜별로 사전 배정한다.
    const mustVisitAssignment = assignMustVisitPlaces(mustVisitPlaces, intent.duration);
    const allAssignedPlaces = [...mustVisitAssignment.values()].flat();

    const dayPromises: Promise<DayItinerary>[] = [];

    for (let day = 1; day <= intent.duration; day++) {
      const assignedForDay = mustVisitAssignment.get(day) || [];
      const reservedForOtherDays = allAssignedPlaces.filter(
        (place) => !assignedForDay.includes(place)
      );

      dayPromises.push(
        generateDayItinerary(day, intent.duration, intent, flight, hotel, {
          assignedMustVisit: assignedForDay,
          suggestion,
          otherDaysMustVisit: reservedForOtherDays,
          dayPlan: extras?.dayPlans?.get(day),
          poiCandidates: extras?.poiCandidates,
        }).then((result) => removeForeignMustVisits(result, reservedForOtherDays))
      );
    }

    const startTime = Date.now();
    const results = await Promise.all(dayPromises);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // 날짜순 정렬 후 날짜 간 관광지 중복 제거
    results.sort((a, b) => a.day - b.day);
    const deduped = dedupeRepeatedPlaces(results);

    console.log(`✅ [4-Route] ${intent.destination} 일정 생성 완료! (${elapsed}s, 병렬 처리)`);

    return deduped;
  } catch (error) {
    console.error('❌ [4-Route] Error:', error);
    return [];
  }
}
