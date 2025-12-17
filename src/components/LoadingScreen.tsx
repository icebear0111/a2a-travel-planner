'use client';

import React, { useState, useEffect } from 'react';
import { Check, Loader2, Plane, Hotel, Map, Wallet } from 'lucide-react';

const steps = [
  { id: 'analyze', label: '여행 취향 분석 중', icon: <Loader2 className="w-5 h-5 animate-spin" /> },
  { id: 'flight', label: '최적 항공권 스캔', icon: <Plane className="w-5 h-5" /> },
  { id: 'hotel', label: '숙소 리뷰 데이터 확인', icon: <Hotel className="w-5 h-5" /> },
  { id: 'route', label: '동선 시뮬레이션 돌리는 중', icon: <Map className="w-5 h-5" /> },
  { id: 'budget', label: '예산 최적화', icon: <Wallet className="w-5 h-5" /> },
];

interface LoadingScreenProps {
  isMobile: boolean;
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  const stepDuration = 100 / steps.length;
  const currentStepIndex = Math.min(Math.floor(progress / stepDuration), steps.length - 1);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 800);
          return 100;
        }
        const increment = prev < 60 ? 3 : 1;
        return Math.min(prev + increment, 100);
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-white font-body flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-0 left-0 w-full h-2 bg-slate-100">
        <div
          className="h-full bg-black transition-all duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="w-full max-w-md space-y-12">
        {/* 메인 텍스트 영역 */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4 border border-slate-100">
            <span className="font-display font-bold text-2xl text-slate-900">{progress}%</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 animate-fadeInUp">
            완벽한 여행을
            <br />
            설계하고 있습니다.
          </h2>
          <p className="text-slate-500 animate-fadeInUp stagger-1">
            잠시만 기다려주세요. AI가 수만 가지 경우의 수를
            <br className="hidden md:block" /> 검토하여 최적의 플랜을 만듭니다.
          </p>
        </div>

        {/* 단계별 체크리스트 */}
        <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-100 space-y-5">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 transition-all duration-500 ${
                  isActive || isCompleted
                    ? 'opacity-100 transform translate-x-0'
                    : 'opacity-30 transform translate-x-2'
                }`}
              >
                {/* 아이콘 상태 */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    isCompleted
                      ? 'bg-black text-white'
                      : isActive
                      ? 'bg-white border border-slate-200 text-black shadow-sm'
                      : 'bg-slate-100 text-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                </div>

                {/* 텍스트 상태 */}
                <div className="flex-1 flex justify-between items-center">
                  <span className={`font-medium ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                  {isActive && (
                    <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-100">
                      Processing...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
