'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  Share2,
  Heart,
  Calendar,
  Map,
  CreditCard,
  MapPin,
  Navigation,
  Star,
} from 'lucide-react';

import {
  initialTripData as tripData,
  initialScheduleData as scheduleData,
  initialBudgetData as budgetData,
} from '@/data/dummyData';

interface ResultScreenProps {
  setCurrentScreen: (screen: string) => void;
}

export default function ResultScreen({ setCurrentScreen }: ResultScreenProps) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'map' | 'budget'>('schedule');
  const [selectedDay, setSelectedDay] = useState(1);
  const [isSaved, setIsSaved] = useState(false);

  const currentSchedule = scheduleData.find((d) => d.day === selectedDay);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 1. 헤더 */}
      <div className="relative h-64 md:h-80 w-full">
        <Image src={tripData.image} alt={tripData.title} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* 상단 버튼들 */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
          <button
            onClick={() => setCurrentScreen('home')}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                isSaved ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setCurrentScreen('share')}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 타이틀 정보 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <span className="inline-block px-3 py-1 bg-black/30 backdrop-blur-md border border-white/20 rounded-full text-xs font-medium mb-3">
            {tripData.days} Days Trip
          </span>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-1">{tripData.title}</h1>
          <p className="text-white/80 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" /> {tripData.dates}
          </p>
        </div>
      </div>

      {/* 2. 탭 네비게이션 */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto flex">
          {[
            { id: 'schedule', label: 'Itinerary', icon: Calendar },
            { id: 'map', label: 'Map', icon: Map },
            { id: 'budget', label: 'Budget', icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'schedule' | 'map' | 'budget')}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-black text-black'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {/* 탭 1: 일정표 */}
        {activeTab === 'schedule' && (
          <div className="animate-fadeInUp">
            {/* 날짜 선택 */}
            <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
              {scheduleData.map((day) => (
                <button
                  key={day.day}
                  onClick={() => setSelectedDay(day.day)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${
                    selectedDay === day.day
                      ? 'bg-black text-white border-black shadow-lg transform scale-105'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-medium">Day</span>
                  <span className="text-xl font-bold">{day.day}</span>
                </button>
              ))}
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1">Day {selectedDay}</h2>
              <p className="text-slate-500">{currentSchedule?.theme}</p>
            </div>

            {/* 타임라인 (올 블랙 버전) */}
            <div className="space-y-0">
              {currentSchedule?.activities.map((item, index) => {
                const isLastItem = index === (currentSchedule?.activities.length || 0) - 1;

                return (
                  <div
                    key={index}
                    className="flex gap-4 group cursor-pointer pb-6 last:pb-0"
                    onClick={() => setCurrentScreen('detail')}
                  >
                    {/* 시간 */}
                    <div className="w-14 pt-1 text-right flex-shrink-0">
                      <span className="text-sm font-bold text-slate-900 block">{item.time}</span>
                      <span className="text-xs text-slate-400 block mt-0.5 font-medium">
                        {item.duration !== '-' ? item.duration : ''}
                      </span>
                    </div>

                    {/* 중앙 기둥 (검은색 점) */}
                    <div className="relative flex flex-col items-center w-6 flex-shrink-0">
                      {!isLastItem && (
                        <div className="absolute top-4 bottom-[-24px] w-[2px] bg-slate-100" />
                      )}
                      <div className="relative z-10 w-3 h-3 rounded-full mt-2 ring-4 ring-white bg-black" />
                    </div>

                    {/* 카드 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-300 hover:shadow-sm rounded-2xl p-4 transition-all duration-200">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-slate-900 truncate pr-2">{item.title}</h3>
                          {/* 태그도 흑백 스타일로 고정 */}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 bg-slate-100 text-slate-600 border border-slate-200">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-1 mb-1">{item.desc}</p>

                        {item.type === 'sightseeing' && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mt-2">
                            <Star className="w-3 h-3 fill-current" /> 4.8 (1.2k)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 👇 타임라인 리스트(div)가 끝난 바로 아래에 이 버튼을 추가해주세요 */}
            <div className="mt-8 pb-8">
              <button
                onClick={() => setCurrentScreen('edit')}
                className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 font-bold flex items-center justify-center gap-2 hover:bg-black hover:text-white hover:border-black transition-all"
              >
                Edit Schedule
              </button>
            </div>
          </div>
        )}

        {/* 탭 2: 지도 */}
        {activeTab === 'map' && (
          <div className="animate-fadeInUp space-y-4">
            <div className="bg-slate-100 rounded-3xl h-96 relative overflow-hidden flex items-center justify-center group">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <MapPin className="w-12 h-12 text-slate-300 group-hover:text-black group-hover:scale-110 transition-all duration-500" />
              <button className="absolute bottom-6 bg-black text-white px-6 py-3 rounded-full font-medium shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Google Maps 열기
              </button>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold mb-4">Day {selectedDay} 이동 경로</h3>
              <div className="flex items-center gap-2 text-sm text-slate-600 overflow-x-auto pb-2">
                <span>호텔</span>
                <span className="text-slate-300">→</span>
                <span>오사카성</span>
                <span className="text-slate-300">→</span>
                <span>우메다 스카이빌딩</span>
                <span className="text-slate-300">→</span>
                <span>헵파이브</span>
              </div>
            </div>
          </div>
        )}

        {/* 탭 3: 예산 (All Black) */}
        {activeTab === 'budget' && (
          <div className="animate-fadeInUp space-y-6">
            <div className="bg-black text-white rounded-3xl p-8 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
              <p className="text-white/60 text-sm mb-1 font-medium">Total Budget (1 Person)</p>
              <h2 className="text-4xl font-bold tracking-tight">
                ₩{budgetData.total.toLocaleString()}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetData.breakdown.map((item, i) => (
                <div
                  key={i}
                  className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-black shadow-sm">
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{item.category}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.percent}%</p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <p className="text-xl font-bold text-slate-900">
                      ₩{item.amount.toLocaleString()}
                    </p>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-black rounded-full"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
