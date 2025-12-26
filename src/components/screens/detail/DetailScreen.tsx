'use client';

import React, { useState } from 'react';
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
  ArrowRight,
} from 'lucide-react';

import { useTripStore } from '@/stores/tripStore';

interface DetailScreenProps {
  onBack: () => void;
}

export default function DetailScreen({ onBack }: DetailScreenProps) {
  const { scheduleData, selectedDay, selectedActivityId } = useTripStore();

  const [isSaved, setIsSaved] = useState(false);

  // 선택된 일정 데이터 찾기
  const currentDaySchedule = scheduleData.find((d) => d.day === selectedDay);
  const activity = currentDaySchedule?.activities.find((item) => item.id === selectedActivityId);

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

  // 상세 화면에 필요한 추가 데이터 (기본값)
  const displayData = {
    ...activity,
    image:
      'https://images.unsplash.com/photo-1528360983277-13d9b152c6d1?q=80&w=2070&auto=format&fit=crop',
    rating: '4.8',
    reviews: '1.2k',
    tips: [
      '아침 일찍 방문하면 인파를 피할 수 있어요.',
      '주유패스가 있으면 무료 입장 가능!',
      '천수각 8층 전망대는 필수 코스입니다.',
    ],
    nearbySpots: [
      { name: '오사카 역사박물관', type: 'Museum', distance: '300m', rating: '4.5' },
      { name: '니시노마루 정원', type: 'Park', distance: '500m', rating: '4.6' },
    ],
  };

  return (
    <div className="min-h-screen bg-white pb-24 font-body text-slate-900">
      {/* 1. 히어로 이미지 */}
      <div className="relative h-[45vh] w-full bg-slate-100">
        <Image
          src={displayData.image}
          alt={displayData.title}
          fill
          className="object-cover"
          priority
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
            <button className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all border border-white/10">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 타이틀 정보 (실제 데이터 반영) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 text-white">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2 leading-tight tracking-tight">
            {displayData.title}
          </h1>
          <div className="flex items-center gap-2 text-white/90 font-medium">
            <MapPin className="w-4 h-4" />
            <span className="text-sm md:text-base">
              {displayData.desc || displayData.time}
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
              label: 'Rating',
              value: displayData.rating,
              sub: `(${displayData.reviews})`,
              icon: Star,
            },
            {
              label: 'Duration',
              value: displayData.duration || '2h',
              sub: 'Recommended',
              icon: Clock,
            },
            { label: 'Cost', value: 'Free', sub: 'Entrance', icon: Info },
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
            {displayData.desc || '상세 설명 정보가 없습니다.'}
          </p>
        </div>

        {/* AI 추천 팁 (임시 데이터 사용) */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-bold">Local Tips</h3>
            <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold">
              AI Pick
            </span>
          </div>
          <div className="space-y-3">
            {displayData.tips.map((tip, i) => (
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

        {/* 주변 추천 (임시 데이터 사용) */}
        <div>
          <h3 className="text-lg font-bold mb-5">Nearby Gems</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            {displayData.nearbySpots.map((spot, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-64 p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-lg mb-1">{spot.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {spot.type} • {spot.distance}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    <Star className="w-3 h-3 text-black fill-current" />
                    <span className="text-xs font-bold">{spot.rating}</span>
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
          <button className="flex-1 py-4 bg-slate-100 rounded-full font-bold text-slate-900 flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
            <Navigation className="w-5 h-5" />
            길찾기
          </button>
          <button className="flex-[2] py-4 bg-black text-white rounded-full font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-black/20">
            일정에 추가하기 <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

