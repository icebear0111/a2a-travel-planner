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
      model: 'gpt-5-nano',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `당신은 숙소 추천 전문가입니다.

## 추천 기준
1. **위치**: 관광 명소 접근성, 대중교통 편리한 중심가
2. **예산 (1박 기준 KRW)**:
   - LOW: 8~15만원
   - MEDIUM: 15~30만원
   - HIGH: 35만원+
3. **동행 타입**:
   - 가족: 넓은 방, 안전한 동네
   - 커플: 로맨틱, 좋은 뷰
   - 친구: 번화가, 접근성
   - 혼자: 가성비, 역세권

## 중요
- 실제 존재하는 호텔 추천
- 정확한 좌표 제공

## 출력 (JSON)
{"name":"호텔명","address":"주소","price":1박가격,"rating":"평점","coordinate":{"lat":number,"lng":number}}`,
        },
        {
          role: 'user',
          content: `목적지: ${intent.destination}
예산: ${intent.budgetLevel}
동행: ${intent.companion}
기간: ${intent.duration}일`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');

    const data = JSON.parse(content);
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
      price: data.price,
      rating: data.rating,
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
