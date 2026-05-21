'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  Heart,
  Clock,
  MapPin,
  Star,
  Navigation,
  Share2,
  Info,
  BadgeCheck,
  Wallet,
} from 'lucide-react';

import { useTripStore } from '@/stores/tripStore';
import { fetchUnsplashImage } from '@/lib/utils/unsplash';
import { Activity, ActivityType } from '@/types/trip';

interface DetailScreenProps {
  onBack: () => void;
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  flight: '항공',
  transport: '이동',
  hotel: '숙소',
  sightseeing: '관광',
  food: '식사',
  theme: '체험',
  shopping: '쇼핑',
  coffee: '카페',
  etc: '기타',
};

const DEFAULT_DETAIL_IMAGE =
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&q=80';

function formatCost(price?: number) {
  if (!price) return '무료';
  return `₩${price.toLocaleString()}`;
}

function buildMapUrl(activity: Activity) {
  const query = activity.address || activity.location || activity.title;

  if (activity.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      query
    )}&query_place_id=${encodeURIComponent(activity.placeId)}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildTips(activity: Activity) {
  const tips: string[] = [];

  if (activity.address) {
    tips.push(`방문 전 지도에서 주소를 한 번 확인하세요: ${activity.address}`);
  } else if (activity.location) {
    tips.push(`${activity.location} 주변 동선과 이동 시간을 미리 확인해두면 좋습니다.`);
  }

  if (activity.travelTimeToNext && activity.travelDistanceToNext) {
    tips.push(
      `다음 일정까지 약 ${activity.travelTimeToNext}, ${activity.travelDistanceToNext} 이동이 예상됩니다.`
    );
  }

  if (activity.price && activity.price > 0) {
    tips.push(`예상 비용은 ${formatCost(activity.price)}입니다. 현장 결제 가능 여부를 확인하세요.`);
  }

  if (activity.type === 'food' || activity.type === 'coffee') {
    tips.push('인기 시간대에는 대기 시간이 생길 수 있으니 피크 타임을 살짝 비껴가면 편합니다.');
  } else if (activity.type === 'sightseeing' || activity.type === 'theme') {
    tips.push('입장권이나 운영 시간이 필요한 장소라면 방문 당일 공식 정보를 확인하세요.');
  } else if (activity.type === 'transport') {
    tips.push('대중교통 막차와 환승 시간을 함께 확인하면 일정이 훨씬 안정적입니다.');
  }

  if (!activity.isPlaceValidated) {
    tips.push('AI가 제안한 장소입니다. 출발 전 실제 위치와 영업 여부를 확인하세요.');
  }

  return tips.slice(0, 3);
}

export default function DetailScreen({ onBack }: DetailScreenProps) {
  const { scheduleData, selectedDay, selectedActivityId, userInput } = useTripStore();

  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState(DEFAULT_DETAIL_IMAGE);

  // 선택된 일정 데이터 찾기
  const currentDaySchedule = scheduleData.find((d) => d.day === selectedDay);
  const activity = currentDaySchedule?.activities.find((item) => item.id === selectedActivityId);

  const nearbyActivities = useMemo(() => {
    if (!currentDaySchedule || !activity) return [];

    return currentDaySchedule.activities
      .filter((item) => item.id !== activity.id && !['flight', 'hotel'].includes(item.type))
      .slice(0, 4);
  }, [activity, currentDaySchedule]);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!activity) return;

      const query = [activity.title, activity.location, userInput.destination]
        .filter(Boolean)
        .join(' ');
      const nextImageUrl = await fetchUnsplashImage(query);

      if (isMounted) {
        setImageUrl(nextImageUrl);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [activity, userInput.destination]);

  // 예외 처리: 만약 데이터를 못 찾으면 (새로고침 등) 뒤로 가기
  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-slate-500 mb-4">일정 정보를 찾을 수 없습니다.</p>
          <button onClick={onBack} className="text-blue-500 font-bold">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  const mapUrl = buildMapUrl(activity);
  const tips = buildTips(activity);
  const placeStatus = activity.isPlaceValidated ? 'Verified' : 'AI Pick';
  const activityLabel = ACTIVITY_LABELS[activity.type] || '기타';

  const handleShare = async () => {
    await navigator.clipboard.writeText(mapUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-body text-slate-900">
      {/* 1. 히어로 이미지 */}
      <div className="relative h-[45vh] w-full bg-slate-100">
        <Image
          src={imageUrl}
          alt={activity.title}
          fill
          className="object-cover"
          priority
          unoptimized={true}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

        {/* 상단 네비게이션 */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pt-6 z-10">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all border border-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/10 ${
                isSaved
                  ? 'bg-rose-500 text-white border-transparent'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className={`w-10 h-10 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/10 ${
                copied ? 'bg-emerald-500' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 타이틀 정보 (실제 데이터 반영) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 text-white">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2 leading-tight tracking-tight">
            {activity.title}
          </h1>
          <div className="flex items-center gap-2 text-white/90 font-medium">
            <MapPin className="w-4 h-4" />
            <span className="text-sm md:text-base">
              {activity.address || activity.location || activity.desc || activity.time}
            </span>
          </div>
        </div>
      </div>

      {/* 2. 상세 콘텐츠 영역 */}
      <div className="-mt-6 relative z-10 bg-white rounded-t-3xl px-6 pt-10">
        {/* 핵심 정보 그리드 */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            {
              label: 'Place',
              value: placeStatus,
              icon: activity.isPlaceValidated ? BadgeCheck : Star,
            },
            {
              label: 'Duration',
              value: activity.duration || '1시간',
              icon: Clock,
            },
            { label: 'Cost', value: formatCost(activity.price), icon: Wallet },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center hover:border-slate-300 transition-colors"
            >
              <item.icon className="w-5 h-5 text-black mb-2" />
              <p className="font-bold text-lg">{item.value}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* 설명 텍스트 (실제 데이터 반영) */}
        <div className="mb-12">
          <h3 className="text-lg font-bold mb-3">About</h3>
          <p className="text-slate-600 leading-relaxed text-lg font-light">
            {activity.desc || `${activityLabel} 일정입니다.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
              {activityLabel}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
              {activity.time}
            </span>
            {activity.travelTimeToNext && (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                다음 일정까지 {activity.travelTimeToNext}
              </span>
            )}
          </div>
        </div>

        {/* 일정 기반 팁 */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-bold">Local Tips</h3>
            <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold">
              AI Pick
            </span>
          </div>
          <div className="space-y-3">
            {tips.map((tip, i) => (
              <div
                key={i}
                className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100"
              >
                <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-slate-800 font-medium">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 같은 날 주변 일정 */}
        <div>
          <h3 className="text-lg font-bold mb-5">Same Day Nearby</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            {nearbyActivities.length === 0 && (
              <div className="w-full p-5 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
                같은 날 표시할 다른 장소가 없습니다.
              </div>
            )}
            {nearbyActivities.map((spot) => (
              <div
                key={spot.id}
                className="flex-shrink-0 w-64 p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-lg mb-1">{spot.title}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {ACTIVITY_LABELS[spot.type]} • {spot.time}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    <Info className="w-3 h-3 text-black" />
                    <span className="text-xs font-bold">{formatCost(spot.price)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 하단 고정 액션 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 p-4 pb-8 md:pb-4 z-50">
        <div className="max-w-3xl mx-auto flex gap-3">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-4 bg-slate-100 rounded-full font-bold text-slate-900 flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
          >
            <Navigation className="w-5 h-5" />
            길찾기
          </a>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-[2] py-4 bg-black text-white rounded-full font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-black/20"
          >
            지도에서 열기 <Navigation className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
