// Unsplash API를 통해 여행지 이미지 가져오기

export const DEFAULT_TRAVEL_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80';
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1200&q=80';

export async function fetchUnsplashImage(query: string): Promise<string> {
  try {
    const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      console.warn('Unsplash API Key가 설정되지 않았습니다.');
      return DEFAULT_TRAVEL_IMAGE;
    }

    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        query
      )}&orientation=landscape&per_page=1`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
      }
    );

    const data = await res.json();

    if (data.results && data.results.length > 0) {
      return `${data.results[0].urls.raw}&w=2560&h=1440&fit=crop&q=80&fmt=jpg`;
    }

    return DEFAULT_TRAVEL_IMAGE;
  } catch (error) {
    console.error('Unsplash API Error:', error);
    return FALLBACK_IMAGE;
  }
}
