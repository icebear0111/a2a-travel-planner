'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, Share2, Heart, Calendar, Map, CreditCard } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import ScheduleTab from './ScheduleTab';
import MapTab from './MapTab';
import BudgetTab from './BudgetTab';

interface ResultScreenProps {
  setCurrentScreen: (screen: string) => void;
}

export default function ResultScreen({ setCurrentScreen }: ResultScreenProps) {
  const { tripData } = useTripStore();

  const [activeTab, setActiveTab] = useState<'schedule' | 'map' | 'budget'>('schedule');
  const [isSaved, setIsSaved] = useState(false);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 히어로 헤더 */}
      <div className="relative h-64 md:h-80 w-full">
        <Image
          src={tripData.image}
          alt={tripData.title}
          fill
          className="object-cover"
          priority
          unoptimized={true}
        />
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

        {/* 여행 정보 */}
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

      {/* 탭 네비게이션 */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto flex">
          {[
            { id: 'schedule', label: '일정', icon: Calendar },
            { id: 'map', label: '지도', icon: Map },
            { id: 'budget', label: '예산', icon: CreditCard },
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

      {/* 탭 콘텐츠 */}
      <div className="max-w-3xl mx-auto p-6">
        {activeTab === 'schedule' && <ScheduleTab onNavigate={setCurrentScreen} />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'budget' && <BudgetTab />}
      </div>
    </div>
  );
}

