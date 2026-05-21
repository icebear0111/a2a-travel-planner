'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Calendar, Trash2, ChevronRight, Loader2, MapPin } from 'lucide-react';
import Header from '@/components/ui/Header';
import { useTripStore } from '@/stores/tripStore';
import { useAuthStore } from '@/stores/authStore';
import type { SavedTrip } from '@/lib/firebase';

interface MyTripsScreenProps {
  onNavigate: (screen: string) => void;
}

export default function MyTripsScreen({ onNavigate }: MyTripsScreenProps) {
  const { user } = useAuthStore();
  const { savedTrips, loadMyTrips, loadTrip, deleteSavedTrip } = useTripStore();
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      if (user) {
        setIsLoading(true);
        await loadMyTrips(user.uid);
        setIsLoading(false);
      }
    };
    fetchTrips();
  }, [user, loadMyTrips]);

  const handleTripClick = async (trip: SavedTrip) => {
    if (user && trip.id) {
      await loadTrip(user.uid, trip.id);
      onNavigate('result');
    }
  };

  const handleDelete = async (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (!user) return;

    if (confirm('이 여행을 삭제하시겠습니까?')) {
      setDeletingId(tripId);
      await deleteSavedTrip(user.uid, tripId);
      setDeletingId(null);
    }
  };

  // 비로그인 상태
  if (!user) {
    return (
      <div className="min-h-screen bg-white font-body text-slate-900">
        <Header onNavigate={onNavigate} />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3">로그인이 필요합니다</h1>
          <p className="text-slate-500 mb-8">저장한 여행을 보려면 로그인해주세요.</p>
          <button
            onClick={() => onNavigate('login')}
            className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-body text-slate-900">
      <Header onNavigate={onNavigate} />

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* 타이틀 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">내 여행</h1>
          <p className="text-slate-500">저장한 여행 일정을 확인하세요</p>
        </div>

        {/* 로딩 상태 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-500">여행 목록을 불러오는 중...</p>
          </div>
        ) : savedTrips.length === 0 ? (
          // 빈 상태
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold mb-3">저장한 여행이 없습니다</h2>
            <p className="text-slate-500 mb-8">새로운 여행 계획을 세워보세요!</p>
            <button
              onClick={() => onNavigate('home')}
              className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
            >
              여행 계획하기
            </button>
          </div>
        ) : (
          // 여행 목록
          <div className="space-y-4">
            {savedTrips.map((trip) => (
              <div
                key={trip.id}
                onClick={() => handleTripClick(trip)}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-400 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex">
                  {/* 이미지 */}
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <Image
                      src={trip.tripData.image || '/placeholder.jpg'}
                      alt={trip.tripData.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg mb-1 group-hover:text-black transition-colors">
                        {trip.tripData.title}
                      </h3>
                      <p className="text-sm text-slate-500 mb-2">{trip.tripData.subtitle}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{trip.tripData.dates}</span>
                        <span>·</span>
                        <span>{trip.tripData.days}일</span>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex flex-col items-center justify-between p-4">
                    <button
                      onClick={(e) => handleDelete(e, trip.id!)}
                      disabled={deletingId === trip.id}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                    >
                      {deletingId === trip.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-black transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
