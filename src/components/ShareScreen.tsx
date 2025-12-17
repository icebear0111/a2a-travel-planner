'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Download,
  Copy,
  Check,
  Link,
  MessageCircle,
  Mail,
  Calendar,
  ArrowUpRight,
  Smartphone,
} from 'lucide-react';
import { initialTripData as tripData } from '@/data/dummyData';

interface ShareScreenProps {
  onBack: () => void;
}

export default function ShareScreen({ onBack }: ShareScreenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    // 실제로는 navigator.clipboard.writeText(...) 사용
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body text-slate-900 pb-20">
      {/* 1. 헤더 (모달 느낌) */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-bold text-lg">Share Trip</h1>
          <button
            onClick={onBack}
            className="p-2 -mr-2 text-slate-500 hover:text-black hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto p-6 space-y-8">
        {/* 2. 미리보기 카드 (티켓/보딩패스 스타일) */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
          {/* 이미지 영역 */}
          <div className="relative h-48 w-full">
            <Image
              src={tripData.image}
              alt={tripData.title}
              fill
              className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-xs font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded border border-white/20 inline-block mb-2">
                ITINERARY
              </p>
              <h2 className="font-display font-bold text-2xl">{tripData.title}</h2>
            </div>
          </div>

          {/* 티켓 정보 영역 */}
          <div className="p-6 relative">
            {/* 펀치 구멍 효과 (좌우) */}
            <div className="absolute -left-3 top-0 w-6 h-6 bg-slate-50 rounded-full" />
            <div className="absolute -right-3 top-0 w-6 h-6 bg-slate-50 rounded-full" />

            {/* 점선 구분선 */}
            <div className="absolute top-3 left-4 right-4 border-t-2 border-dashed border-slate-200" />

            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Date
                </span>
                <span className="text-sm font-bold text-slate-900">{tripData.dates}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Duration
                </span>
                <span className="text-sm font-bold text-slate-900">{tripData.days} Days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Travelers
                </span>
                <span className="text-sm font-bold text-slate-900">2 Adults</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button className="w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-black/20">
                <Download className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* 3. 링크 공유 섹션 */}
        <div>
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Link className="w-4 h-4" /> Share Link
          </h3>
          <div className="flex gap-2">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 truncate font-medium">
              https://a2a.travel/trip/osaka-2024
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
        </div>

        {/* 4. 소셜 공유 그리드 (Bento Grid) */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-400 transition-all group text-left">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">KakaoTalk</p>
              <p className="text-xs text-slate-400">Send message</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-400 transition-all group text-left">
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Email</p>
              <p className="text-xs text-slate-400">Send invite</p>
            </div>
          </button>
        </div>

        {/* 5. 캘린더 연동 리스트 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Sync to Calendar
          </h3>
          <div className="space-y-1">
            {[
              { name: 'Google Calendar', icon: Calendar },
              { name: 'Apple Calendar', icon: Smartphone }, // 적절한 아이콘 대체
              { name: 'Notion', icon: ArrowUpRight },
            ].map((item, i) => (
              <button
                key={i}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:text-black">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-slate-700 group-hover:text-black">
                    {item.name}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-black" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
