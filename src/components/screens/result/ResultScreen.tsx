'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Share2, Save, Check, Calendar, Map, CreditCard, Loader2 } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/ui/Header';
import ScheduleTab from './ScheduleTab';
import MapTab from './MapTab';
import BudgetTab from './BudgetTab';
import { getTravelStyleLabel } from '@/lib/utils/travelStyle';

interface ResultScreenProps {
  setCurrentScreen: (screen: string) => void;
}

export default function ResultScreen({ setCurrentScreen }: ResultScreenProps) {
  const { tripData, userInput, saveCurrentTrip, isSaving, currentTripId } = useTripStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'schedule' | 'map' | 'budget'>('schedule');
  const [isSaved, setIsSaved] = useState(!!currentTripId);

  const handleSave = async () => {
    if (!user) {
      setCurrentScreen('login');
      return;
    }

    if (isSaved) {
      // 이미 저장됨
      return;
    }

    const tripId = await saveCurrentTrip(user.uid);
    if (tripId) {
      setIsSaved(true);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 헤더 */}
      <Header
        showBack
        onBack={() => setCurrentScreen('home')}
        onNavigate={setCurrentScreen}
        rightContent={
          <div className="flex gap-2">
            {/* 저장 버튼 */}
            <button
              onClick={handleSave}
              disabled={isSaving || isSaved}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isSaved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isSaved ? '저장됨' : '내 여행에 저장'}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSaved ? (
                <Check className="w-5 h-5" />
              ) : (
                <Save className="w-5 h-5" />
              )}
            </button>
            {/* 공유 버튼 */}
            <button
              onClick={() => setCurrentScreen('share')}
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {/* 히어로 이미지 */}
      <div className="relative h-56 md:h-72 w-full">
        <Image
          src={tripData.image}
          alt={tripData.title}
          fill
          className="object-cover"
          priority
          unoptimized={true}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* 여행 정보 */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <span className="inline-block px-3 py-1 bg-black/30 backdrop-blur-md border border-white/20 rounded-full text-xs font-medium mb-3">
            {tripData.days} Days Trip
          </span>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-1">{tripData.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {tripData.dates}
            </span>
            {userInput.travelStyle && (
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold backdrop-blur-md">
                {getTravelStyleLabel(userInput.travelStyle)}
              </span>
            )}
          </div>
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
