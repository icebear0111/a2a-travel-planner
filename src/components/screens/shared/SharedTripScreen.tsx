'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Calendar, Map, CreditCard, Loader2, AlertCircle, Home } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import ScheduleTab from '../result/ScheduleTab';
import MapTab from '../result/MapTab';
import BudgetTab from '../result/BudgetTab';

interface SharedTripScreenProps {
  shareId: string;
  onNavigate: (screen: string) => void;
}

export default function SharedTripScreen({ shareId, onNavigate }: SharedTripScreenProps) {
  const { tripData, loadSharedTrip } = useTripStore();
  const [activeTab, setActiveTab] = useState<'schedule' | 'map' | 'budget'>('schedule');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sharedBy, setSharedBy] = useState<string>('');

  useEffect(() => {
    const fetchSharedTrip = async () => {
      setIsLoading(true);
      setError(null);

      const result = await loadSharedTrip(shareId);
      if (result) {
        setSharedBy(result.sharedBy);
      } else {
        setError('공유된 여행을 찾을 수 없습니다');
      }

      setIsLoading(false);
    };

    if (shareId) {
      fetchSharedTrip();
    }
  }, [shareId, loadSharedTrip]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500">여행 정보를 불러오는 중...</p>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h1 className="text-2xl font-bold mb-3 text-center">{error}</h1>
        <p className="text-slate-500 mb-8 text-center">
          링크가 만료되었거나 잘못된 링크일 수 있습니다
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-8 py-3 bg-black text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors"
        >
          <Home className="w-5 h-5" />
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Hero Header */}
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

        {/* 공유자 정보 배지 */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-medium">
            {sharedBy}님이 공유한 여행
          </div>
          <button
            onClick={() => onNavigate('home')}
            className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-medium hover:bg-white/30 transition-colors"
          >
            나도 계획하기
          </button>
        </div>

        {/* Trip Info */}
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

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <div className="max-w-3xl mx-auto p-6">
        {activeTab === 'schedule' && <ScheduleTab onNavigate={onNavigate} readOnly={true} />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'budget' && <BudgetTab />}
      </div>
    </div>
  );
}

