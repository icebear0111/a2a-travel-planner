'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Download,
  Copy,
  Check,
  Link,
  Calendar,
  ArrowUpRight,
  Plane,
  Wallet,
  Loader2,
} from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/ui/Header';

interface ShareScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function ShareScreen({ onBack, onNavigate }: ShareScreenProps) {
  const { tripData, userInput, budgetData, shareTripAndGetUrl, isSharing, currentShareId } =
    useTripStore();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // 공유 URL 생성
  useEffect(() => {
    const generateShareUrl = async () => {
      // 이미 공유된 경우 기존 URL 사용
      if (currentShareId) {
        setShareUrl(`${window.location.origin}?view=shared&id=${currentShareId}`);
        return;
      }

      // 로그인하지 않은 경우 임시 URL 표시
      if (!user) {
        setShareUrl(null);
        return;
      }

      // 공유 URL 생성
      const userName = user.displayName || user.email?.split('@')[0] || '익명';
      const shareId = await shareTripAndGetUrl(userName);
      if (shareId) {
        setShareUrl(`${window.location.origin}?view=shared&id=${shareId}`);
      }
    };

    generateShareUrl();
  }, [user, currentShareId, shareTripAndGetUrl]);

  // 예산 포맷
  const formatBudget = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  const handleCopy = async () => {
    if (!shareUrl) return;

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
    <div className="min-h-screen bg-white font-body text-slate-900 pb-20">
      <Header showBack onBack={onBack} subtitle="여행 공유" onNavigate={onNavigate} />

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

            {/* PDF 다운로드 버튼 */}
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

          {!user ? (
            // 비로그인 상태
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-center">
              <p className="text-sm text-slate-500 mb-2">링크 공유를 위해 로그인이 필요합니다</p>
            </div>
          ) : isSharing ? (
            // 공유 URL 생성 중
            <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              <span className="text-sm text-slate-500">공유 링크 생성 중...</span>
            </div>
          ) : shareUrl ? (
            // 공유 URL 생성 완료
            <>
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
                <p className="text-xs text-emerald-600 mt-2 font-medium">
                  ✓ 클립보드에 복사되었습니다
                </p>
              )}
            </>
          ) : (
            // URL 생성 실패
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-center">
              <p className="text-sm text-slate-500">공유 링크 생성에 실패했습니다</p>
            </div>
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
