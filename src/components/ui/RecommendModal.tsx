'use client';

import React, { useState } from 'react';
import { X, Sparkles, MapPin, Calendar, Users, Wallet, Heart, ArrowRight } from 'lucide-react';

interface RecommendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (destination: string) => void;
}

interface TravelPreferences {
  travelStyle: string[];
  companion: string;
  duration: string;
  budget: string;
  interests: string[];
}

interface Recommendation {
  destination: string;
  description: string;
  highlights: string[];
  bestFor: string;
}

export default function RecommendModal({
  isOpen,
  onClose,
  onSelectDestination,
}: RecommendModalProps) {
  const [step, setStep] = useState<'input' | 'loading' | 'result'>('input');
  const [preferences, setPreferences] = useState<TravelPreferences>({
    travelStyle: [],
    companion: '',
    duration: '',
    budget: '',
    interests: [],
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const travelStyles = ['힐링/휴양', '액티비티/모험', '문화/역사', '미식 탐방', '쇼핑', '자연 탐험'];
  const companions = ['혼자', '커플/연인', '친구', '가족', '단체'];
  const durations = ['2-3일', '4-5일', '6-7일', '1주일 이상'];
  const budgets = ['알뜰하게', '적당하게', '여유롭게'];
  const interests = ['맛집', '카페', '자연경관', '랜드마크', '박물관/미술관', '야경', '쇼핑몰', '로컬 체험'];

  const toggleArrayItem = (arr: string[], item: string) => {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  };

  const handleSubmit = async () => {
    if (!preferences.companion || !preferences.duration || !preferences.budget) {
      alert('필수 항목을 모두 선택해주세요.');
      return;
    }

    setStep('loading');

    try {
      const response = await fetch('/api/recommend-destination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) throw new Error('추천 요청 실패');

      const data = await response.json();
      setRecommendations(data.recommendations);
      setStep('result');
    } catch (error) {
      console.error('추천 실패:', error);
      alert('여행지 추천 중 오류가 발생했습니다.');
      setStep('input');
    }
  };

  const handleSelectDestination = (destination: string) => {
    onSelectDestination(destination);
    handleClose();
  };

  const handleClose = () => {
    setStep('input');
    setPreferences({
      travelStyle: [],
      companion: '',
      duration: '',
      budget: '',
      interests: [],
    });
    setRecommendations([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={handleClose} 
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-none px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">AI 여행지 추천</h2>
              <p className="text-xs text-slate-500 font-medium">취향을 분석해 딱 맞는 곳을 찾아드려요</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors -mr-2"
          >
            <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {step === 'input' && (
            <div className="space-y-8 pb-4">
              {/* 여행 스타일 */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-slate-900" />
                  <h3 className="text-sm font-bold text-slate-900">어떤 여행을 원하시나요?</h3>
                  <span className="text-xs text-slate-400 font-medium">(복수 선택)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {travelStyles.map((style) => (
                    <button
                      key={style}
                      onClick={() =>
                        setPreferences((p) => ({ ...p, travelStyle: toggleArrayItem(p.travelStyle, style) }))
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        preferences.travelStyle.includes(style)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </section>

              {/* 동행자 */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-slate-900" />
                  <h3 className="text-sm font-bold text-slate-900">누구와 함께 가시나요?</h3>
                  <span className="text-xs text-rose-500 font-medium">*</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {companions.map((comp) => (
                    <button
                      key={comp}
                      onClick={() => setPreferences((p) => ({ ...p, companion: comp }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        preferences.companion === comp
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {comp}
                    </button>
                  ))}
                </div>
              </section>

              {/* 여행 기간 */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-slate-900" />
                  <h3 className="text-sm font-bold text-slate-900">여행 기간은?</h3>
                  <span className="text-xs text-rose-500 font-medium">*</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {durations.map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setPreferences((p) => ({ ...p, duration: dur }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        preferences.duration === dur
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {dur}
                    </button>
                  ))}
                </div>
              </section>

              {/* 예산 */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-4 h-4 text-slate-900" />
                  <h3 className="text-sm font-bold text-slate-900">예산은 어느 정도인가요?</h3>
                  <span className="text-xs text-rose-500 font-medium">*</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {budgets.map((bud) => (
                    <button
                      key={bud}
                      onClick={() => setPreferences((p) => ({ ...p, budget: bud }))}
                      className={`py-3 rounded-xl text-sm font-medium transition-all border flex flex-col items-center justify-center gap-1 ${
                        preferences.budget === bud
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{bud}</span>
                      <span className={`text-[10px] ${preferences.budget === bud ? 'text-slate-400' : 'text-slate-400'}`}>
                        {bud === '알뜰하게' ? '~100만원' : bud === '적당하게' ? '100~200만원' : '200만원~'}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* 관심사 */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-slate-900" />
                  <h3 className="text-sm font-bold text-slate-900">관심 있는 활동</h3>
                  <span className="text-xs text-slate-400 font-medium">(복수 선택)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {interests.map((int) => (
                    <button
                      key={int}
                      onClick={() =>
                        setPreferences((p) => ({ ...p, interests: toggleArrayItem(p.interests, int) }))
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        preferences.interests.includes(int)
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {int}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {step === 'loading' && (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                  <Sparkles className="w-8 h-8 text-slate-400" />
                </div>
                <div className="absolute inset-0 border-4 border-slate-100 border-t-black rounded-full animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">여행지 분석 중...</h3>
              <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
                입력하신 취향을 바탕으로<br />최적의 여행지를 찾고 있습니다.
              </p>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-500 text-sm">당신의 취향에 맞는 추천 여행지입니다.</p>
                <button 
                  onClick={() => setStep('input')}
                  className="text-xs font-medium text-slate-400 hover:text-black underline underline-offset-4"
                >
                  다시 설정하기
                </button>
              </div>

              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectDestination(rec.destination)}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-5 hover:border-black transition-all cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center justify-center w-5 h-5 bg-black text-white text-[10px] font-bold rounded-full">
                          {index + 1}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-black">
                          {rec.destination}
                        </h3>
                      </div>
                      <p className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded inline-block mt-1">
                        {rec.bestFor}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    {rec.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {rec.highlights.map((highlight, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-500 group-hover:border-slate-200 transition-colors"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Buttons (Input Step Only) */}
        {step === 'input' && (
          <div className="flex-none p-6 border-t border-slate-100 bg-white">
            <button
              onClick={handleSubmit}
              className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              AI 맞춤 여행지 추천받기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
