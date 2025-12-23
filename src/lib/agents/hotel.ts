import OpenAI from 'openai';
import { Intent, UserInput } from './intent';
import { FlightContext } from './flight';

export interface HotelContext {
  name: string;
  address: string;
  price: number;
  coordinate: { lat: number; lng: number };
  rating: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function determineHotel(
  intent: Intent,
  flight: FlightContext,
  input: UserInput
): Promise<HotelContext> {
  console.log(`🏨 [3-Hotel] ${intent.destination} 숙소 데이터 정밀 분석 중...`);

  // 1️⃣ [Case A] 사용자 입력 숙소 확인
  const userHotels = input.hotels;
  const hasUserHotel = userHotels.length > 0 && userHotels[0].name.trim() !== '';

  if (hasUserHotel) {
    const primaryHotel = userHotels[0];
    console.log(`⏩ [3-Hotel] 사용자 지정 숙소 식별: ${primaryHotel.name} (위치 데이터 검색)`);

    // 1박 가격 계산
    const nights = Math.max(1, intent.duration - 1);
    const pricePerNight = Math.round(primaryHotel.price / nights);

    try {
      // 📍 사용자가 입력한 호텔의 '실제 위치'를 AI가 검색
      const response = await openai.chat.completions.create({
        model: 'gpt-5-nano',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `
              You are a **Location Data Expert**.
              The user has already booked a specific hotel.
              Your job is to find the **Address** and **Real Coordinates (Lat/Lng)** of that specific hotel.

              [CONTEXT]
              - Hotel Name: "${primaryHotel.name}"
              - City: "${intent.destination}"

              [REQUIRED JSON FORMAT]
              {
                "address": "string (Real address)",
                "coordinate": { "lat": number, "lng": number },
                "rating": "string (Estimated star rating, e.g. '4.5')"
              }
            `,
          },
          {
            role: 'user',
            content: `Find location data for "${primaryHotel.name}" in ${intent.destination}.`,
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No content');
      const data = JSON.parse(content);

      console.log(`✅ [3-Hotel] 위치 확보 완료: ${data.address}`);

      return {
        name: primaryHotel.name,
        address: data.address || intent.destination,
        price: pricePerNight,
        rating: data.rating || 'User Choice',
        coordinate: data.coordinate || { lat: 37.5665, lng: 126.978 },
      };
    } catch (error) {
      console.error('❌ [3-Hotel] User Hotel Location Error:', error);
      // 검색 실패 시 fallback
      return {
        name: primaryHotel.name,
        address: intent.destination,
        price: pricePerNight,
        rating: 'User Choice',
        coordinate: { lat: 37.5665, lng: 126.978 },
      };
    }
  }

  // 2️⃣ [Case B] AI 정밀 추천 (사용자 입력 없을 때)
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `
            You are a **Senior Travel Concierge** specializing in accommodation selection.
            Your goal is to recommend the **single best basecamp** hotel based on the user's persona and budget.

            [CONTEXT]
            - Destination: ${intent.destination}
            - Companion Type: ${intent.companion} (Critical factor for room type & vibe)
            - Transport Hub: ${flight.destAirportCode} (Consider accessibility)
            - Duration: ${intent.duration} days

            [ANALYSIS TASKS]
            1. **Location Strategy**: 
               - Select a hotel located in a safe, central area convenient for sightseeing.
               - Ensure reasonable access to the airport (${flight.destAirportCode}).
            
            2. **Budget Alignment ('price' per night in KRW)**:
               - **LOW** (~150,000 KRW): Clean hostels, business hotels, or guest houses. Focus on value.
               - **MEDIUM** (150,000 ~ 300,000 KRW): 3-4 Star city hotels. Balance of comfort and price.
               - **HIGH** (350,000+ KRW): 5 Star luxury hotels or resorts. Focus on amenities and service.
               * Current Budget Level: **${intent.budgetLevel}**

            3. **Companion Logic**:
               - **Family**: Spacious rooms, kid-friendly, safe neighborhood.
               - **Couple**: Romantic vibe, nice view, good amenities.
               - **Friends**: Close to nightlife/shopping, twin beds availability.

            4. **Data Accuracy**:
               - Provide REAL coordinates (lat, lng) for the map.
               - Provide a realistic star rating (e.g., "4.5").

            [REQUIRED JSON FORMAT]
            {
              "name": "string",
              "address": "string",
              "price": number,
              "rating": "string",
              "coordinate": { "lat": number, "lng": number }
            }
          `,
        },
        {
          role: 'user',
          content: `Recommend the best hotel in "${intent.destination}" for a "${intent.budgetLevel}" budget trip with "${intent.companion}".`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content from OpenAI');

    const data = JSON.parse(content);
    console.log(
      `✅ [3-Hotel] AI 추천 완료: ${data.name} (1박 ${data.price.toLocaleString()}원, 평점: ${
        data.rating
      })`
    );

    return {
      name: data.name,
      address: data.address,
      price: data.price,
      rating: data.rating,
      coordinate: data.coordinate,
    };
  } catch (error) {
    console.error('❌ [3-Hotel] Error:', error);
    // 에러 발생 시 비상용 기본값
    return {
      name: 'Central City Hotel',
      address: intent.destination,
      price: 150000,
      coordinate: { lat: 37.5665, lng: 126.978 },
      rating: '4.0',
    };
  }
}
