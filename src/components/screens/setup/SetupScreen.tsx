'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Header from '@/components/ui/Header';
import FlightSection from './FlightSection';
import HotelSection from './HotelSection';

interface SetupScreenProps {
  onBack: () => void;
  onNext: () => void;
}

export default function SetupScreen({ onBack, onNext }: SetupScreenProps) {
  const { userInput, setFlightInput, setUserInput, generateTrip } = useTripStore();

  const [isFlightUndecided, setIsFlightUndecided] = useState(false);
  const [isHotelUndecided, setIsHotelUndecided] = useState(false);

  // 제출 핸들러
  const handleSubmit = () => {
    // 1. 항공권 '확정' 상태인데 날짜가 비어있으면 경고
    if (!isFlightUndecided && (!userInput.flight.departureDate || !userInput.flight.returnDate)) {
      alert('항공권의 가는 날/오는 날짜를 입력해주세요.');
      return;
    }

    // 2. 미정 시 데이터 초기화
    if (isFlightUndecided) {
      setFlightInput({
        originAirportCode: '',
        destAirportCode: '',
        price: 0,
        departureDate: '',
        departureTime: '',
        returnDate: '',
        returnTime: '',
      });
    }

    if (isHotelUndecided) {
      setUserInput({ ...userInput, hotels: [] });
    }

    onNext();
    generateTrip();
  };

  return (
    <div className="min-h-screen bg-white font-body text-slate-900">
      <Header showBack onBack={onBack} />

      <main className="max-w-2xl mx-auto px-6 pt-10 pb-32">
        {/* 항공권 섹션 */}
        <FlightSection isUndecided={isFlightUndecided} onUndecidedChange={setIsFlightUndecided} />

        <div className="h-px bg-slate-100 mb-12" />

        {/* 숙소 섹션 */}
        <HotelSection isUndecided={isHotelUndecided} onUndecidedChange={setIsHotelUndecided} />
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none">
        <div className="max-w-2xl mx-auto flex justify-end pointer-events-auto">
          <button
            onClick={handleSubmit}
            className="bg-black text-white px-8 py-4 rounded-full font-bold text-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-slate-800 transition-all duration-300 active:scale-95 flex items-center gap-3"
          >
            <span>일정 생성</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

