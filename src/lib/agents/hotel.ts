import OpenAI from 'openai';
import { Intent, UserInput } from './intent';
import { geocodePlace } from '@/lib/utils/googleMaps';

export interface HotelContext {
  name: string;
  address: string;
  price: number;
  coordinate: { lat: number; lng: number };
  rating: string;
  placeId?: string;
  isPlaceValidated?: boolean;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// 폴백용 기본 좌표 (AI 실패 시에만 사용)
// ============================================
const FALLBACK_COORDINATES: Record<string, { lat: number; lng: number }> = {
  도쿄: { lat: 35.6762, lng: 139.6503 },
  오사카: { lat: 34.6937, lng: 135.5023 },
  교토: { lat: 35.0116, lng: 135.7681 },
  후쿠오카: { lat: 33.5904, lng: 130.4017 },
  방콕: { lat: 13.7563, lng: 100.5018 },
  발리: { lat: -8.4095, lng: 115.1889 },
  파리: { lat: 48.8566, lng: 2.3522 },
  런던: { lat: 51.5074, lng: -0.1278 },
};

const DEFAULT_COORDINATE = { lat: 35.6762, lng: 139.6503 };

export async function determineHotel(
  intent: Intent,
  input: UserInput
): Promise<HotelContext> {
  console.log(`🏨 [3-Hotel] ${intent.destination} 숙소 분석 중...`);

  const userHotels = input.hotels;
  const hasUserHotel = userHotels.length > 0 && userHotels[0].name.trim() !== '';

  // ============================================
  // Case A: 사용자 지정 숙소 → 위치 검색만
  // ============================================
  if (hasUserHotel) {
    const primaryHotel = userHotels[0];
    console.log(`📍 [3-Hotel] 사용자 숙소 "${primaryHotel.name}" 위치 검색`);

    const nights = Math.max(1, intent.duration - 1);
    const pricePerNight = Math.round(primaryHotel.price / nights);

    const validatedPlace = await geocodePlace(`${primaryHotel.name}, ${intent.destination}`);
    const address = validatedPlace.formattedAddress || intent.destination;

    console.log(`✅ [3-Hotel] 사용자 숙소 위치 확인: ${address}`);

    return {
      name: primaryHotel.name,
      address,
      price: pricePerNight,
      rating: '4.0',
      coordinate:
        validatedPlace.coordinate ||
        FALLBACK_COORDINATES[intent.destination] ||
        DEFAULT_COORDINATE,
      placeId: validatedPlace.placeId,
      isPlaceValidated: validatedPlace.isValidated,
    };
  }

  // ============================================
  // Case B: AI 숙소 추천 (자유롭게)
  // ============================================
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.4-mini',
      // 단순 정보 조회라 추론을 생략해 응답 속도를 우선한다.
      reasoning_effort: 'none',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `당신은 여행 일정에 맞는 숙소를 고르는 전문가입니다. 이 숙소는 매일 일정의 출발점(베이스캠프)이 되므로 위치가 가장 중요합니다.

## 추천 기준
1. **위치**: 주요 관광지·맛집 접근성이 좋은 중심가. 대표 관광 동선의 한가운데 또는 교통 요지.
2. **예산 (1박 기준 KRW)**:
   - LOW: 8~15만원
   - MEDIUM: 15~30만원
   - HIGH: 35만원+
3. **여행 컨셉 반영**: 자연/힐링이면 조용하고 전망 좋은 곳, 맛집 중심이면 먹자골목·시장 접근성, 쇼핑이면 주요 상권 도보권.
4. **국내 여행**이면 호텔 외에 실제 운영 중인 리조트·프리미엄 펜션도 후보로 고려.

## 중요
- 반드시 실제 존재하고 현재 운영 중인 숙소의 정확한 실명을 사용 (폐업·가상의 숙소 금지)
- 정확한 좌표와 실제 주소 제공
- price는 2026년 기준 현실적인 1박 요금

## 출력 (JSON)
{"name":"숙소명","address":"주소","price":1박가격,"rating":"평점","coordinate":{"lat":number,"lng":number}}`,
        },
        {
          role: 'user',
          content: `목적지: ${intent.destination}${intent.isDomestic ? ' (국내 여행)' : ''}
예산: ${intent.budgetLevel}
기간: ${intent.duration}일 (${Math.max(1, intent.duration - 1)}박)
여행 테마: ${intent.themes.join(', ')}
여행 컨셉: ${intent.travelStyle?.join(', ') || '균형'}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');

    const data = JSON.parse(content);
    // AI가 price를 누락하거나 숫자가 아닌 값으로 반환하면 NaN이 예산 계산에 전파되어
    // 항상 FAIL → 불필요한 일정 재조정이 발생하므로 반드시 숫자로 보정한다.
    const pricePerNight =
      Number.isFinite(Number(data.price)) && Number(data.price) > 0 ? Number(data.price) : 200000;
    const validatedPlace = await geocodePlace(`${data.name}, ${intent.destination}`);
    const coordinate =
      validatedPlace.coordinate ||
      data.coordinate ||
      FALLBACK_COORDINATES[intent.destination] ||
      DEFAULT_COORDINATE;
    const address = validatedPlace.formattedAddress || data.address || intent.destination;

    console.log(
      `✅ [3-Hotel] 추천: ${data.name} (1박 ${data.price?.toLocaleString()}원, ⭐${data.rating})`
    );

    return {
      name: data.name,
      address,
      price: pricePerNight,
      rating: data.rating || '4.0',
      coordinate,
      placeId: validatedPlace.placeId,
      isPlaceValidated: validatedPlace.isValidated,
    };
  } catch (error) {
    console.error('❌ [3-Hotel] Error:', error);
    // 폴백
    const fallbackPrice =
      intent.budgetLevel === 'LOW' ? 100000 : intent.budgetLevel === 'HIGH' ? 400000 : 200000;
    const fallbackName = `${intent.destination} 시티 호텔`;
    const validatedPlace = await geocodePlace(`${fallbackName}, ${intent.destination}`);

    return {
      name: fallbackName,
      address: validatedPlace.formattedAddress || intent.destination,
      price: fallbackPrice,
      coordinate:
        validatedPlace.coordinate || FALLBACK_COORDINATES[intent.destination] || DEFAULT_COORDINATE,
      rating: '4.0',
      placeId: validatedPlace.placeId,
      isPlaceValidated: validatedPlace.isValidated,
    };
  }
}
