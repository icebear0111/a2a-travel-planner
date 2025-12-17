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
import { spotData } from '@/data/dummyData';

interface DetailScreenProps {
  onBack: () => void;
}

export default function DetailScreen({ onBack }: DetailScreenProps) {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <div className="min-h-screen bg-white pb-24 font-body text-slate-900">
      {/* 1. 히어로 이미지 (화면 상단 45%) */}
      <div className="relative h-[45vh] w-full bg-slate-100">
        <Image src={spotData.image} alt={spotData.title} fill className="object-cover" priority />
        {/* 이미지 위 그라데이션 (텍스트 가독성용) */}
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

        {/* 타이틀 정보 (이미지 하단) */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-10 text-white">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-2 leading-tight tracking-tight">
            {spotData.title}
          </h1>
          <div className="flex items-center gap-2 text-white/90 font-medium">
            <MapPin className="w-4 h-4" />
            <span className="text-sm md:text-base">{spotData.subtitle}</span>
          </div>
        </div>
      </div>

      {/* 2. 상세 콘텐츠 영역 */}
      <div className="-mt-6 relative z-10 bg-white rounded-t-3xl px-6 pt-10">
        {/* 핵심 정보 그리드 (Bento Grid 스타일 - 모노크롬) */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Rating', value: spotData.rating, sub: `(${spotData.reviews})`, icon: Star },
            { label: 'Duration', value: spotData.duration, sub: 'Recommended', icon: Clock },
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

        {/* 설명 텍스트 */}
        <div className="mb-12">
          <h3 className="text-lg font-bold mb-3">About</h3>
          <p className="text-slate-600 leading-relaxed text-lg font-light">
            {spotData.description}
          </p>
        </div>

        {/* AI 추천 팁 (심플 리스트) */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-bold">Local Tips</h3>
            <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold">
              AI Pick
            </span>
          </div>
          <div className="space-y-3">
            {spotData.tips.map((tip, i) => (
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

        {/* 주변 추천 (가로 스크롤) */}
        <div>
          <h3 className="text-lg font-bold mb-5">Nearby Gems</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            {spotData.nearbySpots.map((spot, i) => (
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
