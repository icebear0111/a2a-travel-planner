'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Menu, ArrowRight, MapPin, Compass, Search } from 'lucide-react';
import { homeSuggestions, homeRecentTrips } from '@/data/dummyData';

interface HomeScreenProps {
  isMobile: boolean;
  onStartPlanning: () => void;
}

export default function HomeScreen({ isMobile, onStartPlanning }: HomeScreenProps) {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="min-h-full bg-white font-body text-slate-900 pb-20">
      {/* 1. 헤더: 아주 심플하게 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">A2A.</span>
          </div>

          {isMobile ? (
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <nav className="flex gap-6 text-sm font-medium text-slate-500">
              <button className="hover:text-black transition-colors">Trips</button>
              <button className="hover:text-black transition-colors">Saved</button>
              <button className="text-black bg-slate-100 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors">
                Log in
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 md:pt-20">
        {/* 2. 히어로 섹션: 거대한 타이포그래피 */}
        <section className="mb-16">
          <h1
            className={`font-display font-medium leading-[1.1] mb-6 ${
              isMobile ? 'text-5xl' : 'text-7xl'
            }`}
          >
            Travel smarter,
            <br />
            <span className="text-slate-400">not harder.</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-xl leading-relaxed mb-10">
            복잡한 계획은 AI에게 맡기세요. <br className="hidden md:block" />
            당신은 오직{' '}
            <span className="text-black font-semibold underline decoration-2 decoration-sky-300 underline-offset-4">
              떠나는 설렘
            </span>
            만 즐기면 됩니다.
          </p>

          {/* 3. 모던한 검색바 (Perplexity 스타일) */}
          <div className="relative max-w-2xl group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-teal-100 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] p-2 flex items-center transition-all focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black/10">
              <div className="pl-4 pr-2">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="이번엔 어디로 떠나시나요?"
                className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-slate-400 py-3 text-slate-900"
              />
              <button
                onClick={onStartPlanning}
                className="bg-black text-white p-3 md:px-6 md:py-3 rounded-full font-medium hover:bg-slate-800 transition-transform active:scale-95 flex items-center gap-2"
              >
                <span className="hidden md:inline">Plan trip</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 추천 태그 */}
          <div className="mt-6 flex flex-wrap gap-2">
            {homeSuggestions.map((item, i) => (
              <button
                key={i}
                onClick={() => setInputValue(item.text)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-sm font-medium text-slate-600 transition-colors flex items-center gap-2"
              >
                <span>{item.emoji}</span>
                {item.text}
              </button>
            ))}
          </div>
        </section>

        {/* 4. 벤토 그리드 스타일의 최근 일정/추천 */}
        <section className="mb-20">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Curated for you</h2>
            <button className="text-sm font-semibold underline decoration-slate-300 underline-offset-4 hover:decoration-black transition-all">
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[500px]">
            {/* 첫 번째 큰 카드 (데이터의 첫 번째 항목 사용) */}
            <div className="group md:col-span-2 relative rounded-3xl overflow-hidden bg-slate-100 cursor-pointer h-80 md:h-auto">
              <Image
                src={homeRecentTrips[0].image} // 👈 데이터 연동
                alt={homeRecentTrips[0].title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 text-white">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium border border-white/20 mb-3 inline-block">
                  Trending
                </span>
                <h3 className="text-3xl md:text-4xl font-bold mb-2">{homeRecentTrips[0].title}</h3>
                <p className="text-white/80 line-clamp-2 max-w-md">
                  현대적인 네온 사인과 전통적인 문화가 공존하는 매력적인 도시.
                </p>
              </div>
            </div>

            {/* 오른쪽 작은 카드들 */}
            <div className="flex flex-col gap-4">
              {/* 두 번째 작은 카드 (데이터의 두 번째 항목 사용) */}
              <div className="flex-1 relative rounded-3xl overflow-hidden bg-slate-100 group cursor-pointer h-60 md:h-auto">
                <Image
                  src={homeRecentTrips[1].image} // 👈 데이터 연동
                  alt={homeRecentTrips[1].title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                <div className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-sm">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-xl font-bold">{homeRecentTrips[1].title}</h3>
                  <p className="text-sm opacity-90">미식의 천국</p>
                </div>
              </div>

              <div className="flex-1 bg-slate-50 rounded-3xl p-6 border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer flex flex-col justify-center items-start">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">어디로 갈지 고민인가요?</h3>
                <p className="text-sm text-slate-500 mb-4">AI가 당신의 취향을 분석해드릴게요.</p>
                <button className="text-sm font-semibold text-black flex items-center gap-1 hover:gap-2 transition-all">
                  추천받기 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 5. 신뢰도 섹션 (간단하게) */}
        <section className="py-10 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Users', value: '50k+' },
            { label: 'Cities', value: '120+' },
            { label: 'Plans Created', value: '1M+' },
            { label: 'Satisfaction', value: '4.9/5' },
          ].map((stat, i) => (
            <div key={i}>
              <p className="text-3xl font-display font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
