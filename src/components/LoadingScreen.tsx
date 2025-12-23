'use client';

import React, { useEffect, useState } from 'react';
import { Plane, Hotel, Map, Wallet, Sparkles, Utensils } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';

interface LoadingScreenProps {
  onComplete: () => void;
}

// 로딩 중에 보여줄 아이콘들 (순서대로 롤링)
const ICONS = [
  { icon: Plane, key: 'flight' },
  { icon: Hotel, key: 'hotel' },
  { icon: Map, key: 'map' },
  { icon: Utensils, key: 'food' },
  { icon: Wallet, key: 'budget' },
];

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const { currentAgentStatus, isGenerating } = useTripStore();
  const [activeIconIndex, setActiveIconIndex] = useState(0);

  // 1. 실제 진행률 계산 (백엔드 데이터 기반)
  const completedCount = currentAgentStatus.filter((a) => a.status === 'complete').length;
  // 너무 0%에 오래 머물지 않도록 최소값 보정
  const progress = Math.max(5, Math.round((completedCount / currentAgentStatus.length) * 100));

  // 2. 아이콘 자동 롤링 애니메이션 (0.8초마다 변경)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIconIndex((prev) => (prev + 1) % ICONS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // 3. 100% 도달 시 완료 처리
  useEffect(() => {
    if (!isGenerating && progress === 100) {
      const timer = setTimeout(() => {
        onComplete();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, progress, onComplete]);

  // 현재 보여줄 아이콘 컴포넌트
  const CurrentIcon = ICONS[activeIconIndex].icon;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* 1. 중앙 아이콘 애니메이션 영역 */}
      <div className="relative z-10 flex flex-col items-center space-y-8 animate-fadeInUp">
        {/* 원형 아이콘 컨테이너 */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* 뒤쪽에서 퍼지는 파동 효과 (Pulse) */}
          <div className="absolute inset-0 bg-slate-100 rounded-full animate-ping opacity-75" />
          <div className="absolute inset-0 bg-white rounded-full border border-slate-100 shadow-sm z-10" />

          {/* 아이콘 교체 애니메이션 */}
          <div className="relative z-20 text-black transition-all duration-500 transform scale-100">
            <CurrentIcon className="w-10 h-10 animate-pulse" strokeWidth={1.5} />
          </div>

          {/* 장식용 스파클 아이콘 (고정) */}
          <div className="absolute -top-2 -right-2 z-30 bg-black text-white p-1.5 rounded-full shadow-lg">
            <Sparkles className="w-3 h-3" />
          </div>
        </div>

        {/* 2. 텍스트 & 프로그레스 바 */}
        <div className="w-64 space-y-4 text-center">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {progress === 100 ? '여행 생성 완료!' : 'AI가 완벽한 여행을 설계 중...'}
          </h2>

          {/* 프로그레스 바 트랙 */}
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            {/* 실제 진행률 바 */}
            <div
              className="h-full bg-black rounded-full transition-all duration-700 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 font-medium">{progress}% Completed</p>
        </div>
      </div>

      {/* 3. 배경 데코레이션 (은은한 블러 효과) */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-slate-50 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-slate-100 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      </div>
    </div>
  );
}
