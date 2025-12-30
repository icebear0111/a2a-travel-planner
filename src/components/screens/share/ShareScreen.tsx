'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Download,
  Copy,
  Check,
  Link,
  Calendar,
  ArrowUpRight,
  Plane,
  Wallet,
} from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';

interface ShareScreenProps {
  onBack: () => void;
}

export default function ShareScreen({ onBack }: ShareScreenProps) {
  const { tripData, userInput, budgetData } = useTripStore();
  const [copied, setCopied] = useState(false);

  // 공유 링크 생성 (목적지 기반)
  const shareSlug = userInput.destination
    ? userInput.destination.toLowerCase().replace(/\s+/g, '-')
    : 'my-trip';
  const shareUrl = `https://a2a.travel/trip/${shareSlug}-${Date.now().toString(36)}`;

  // 예산 포맷
  const formatBudget = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body text-slate-900 pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold text-lg">여행 공유</h1>
          <button
            onClick={onBack}
            className="p-2 -mr-2 text-slate-500 hover:text-black hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* 미리보기 카드 */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
          {/* 이미지 영역 */}
          <div className="relative h-44 w-full">
            <Image
              src={tripData.image || '/placeholder.jpg'}
              alt={tripData.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <p className="text-xs font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded inline-block mb-2">
                ✈️ ITINERARY
              </p>
              <h2 className="font-bold text-xl leading-tight">
                {tripData.title || userInput.destination}
              </h2>
              {tripData.subtitle && (
                <p className="text-white/80 text-sm mt-1">{tripData.subtitle}</p>
              )}
            </div>
          </div>

          {/* 티켓 정보 영역 */}
          <div className="p-5 relative">
            {/* 펀치 구멍 효과 */}
            <div className="absolute -left-3 top-0 w-6 h-6 bg-slate-50 rounded-full" />
            <div className="absolute -right-3 top-0 w-6 h-6 bg-slate-50 rounded-full" />
            <div className="absolute top-3 left-4 right-4 border-t-2 border-dashed border-slate-200" />

            <div className="mt-4 space-y-3">
              {/* 날짜 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">일정</span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {tripData.dates ||
                    `${userInput.flight.departureDate} ~ ${userInput.flight.returnDate}`}
                </span>
              </div>

              {/* 기간 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500">
                  <Plane className="w-4 h-4" />
                  <span className="text-xs font-medium">기간</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{tripData.days}일</span>
              </div>

              {/* 예상 비용 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-medium">예상 비용</span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {formatBudget(budgetData.total)}
                </span>
              </div>
            </div>

            {/* 다운로드 버튼 */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <button className="w-full py-3.5 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-black/20">
                <Download className="w-5 h-5" />
                PDF 다운로드
              </button>
            </div>
          </div>
        </div>

        {/* 링크 공유 */}
        <div>
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Link className="w-4 h-4" /> 링크 공유
          </h3>
          <div className="flex gap-2">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 truncate font-medium">
              {shareUrl}
            </div>
            <button
              onClick={handleCopy}
              className={`px-4 py-3 rounded-xl transition-all font-bold border ${
                copied
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
              }`}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">✓ 클립보드에 복사되었습니다</p>
          )}
        </div>

        {/* 캘린더 연동 */}
        <button className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-400 transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <Calendar className="w-5 h-5 text-blue-600 group-hover:text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900">Google Calendar 추가</p>
              <p className="text-xs text-slate-400">일정을 캘린더에 저장</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-black" />
        </button>
      </div>
    </div>
  );
}
