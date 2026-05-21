'use client';

import React from 'react';
import { Plane, Banknote, Check, ChevronDown } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { ORIGIN_AIRPORTS, ARRIVAL_AIRPORTS } from '@/constants/airports';
import { formatKoreanCurrency } from '@/lib/utils/format';
import CustomTimePicker from '@/components/ui/CustomTimePicker';

interface FlightSectionProps {
  isUndecided: boolean;
  onUndecidedChange: (value: boolean) => void;
  departureDate: string;
  returnDate: string;
}

const formatDateWithDay = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
};

export default function FlightSection({
  isUndecided,
  onUndecidedChange,
  departureDate,
  returnDate,
}: FlightSectionProps) {
  const { userInput, setFlightInput } = useTripStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
      setFlightInput({ [name]: Number(value) });
    } else {
      setFlightInput({ [name]: value });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">항공권 정보</h2>

        <button
          onClick={() => onUndecidedChange(!isUndecided)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
            isUndecided
              ? 'bg-black text-white shadow-lg shadow-black/20'
              : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              isUndecided ? 'border-white bg-white' : 'border-slate-300'
            }`}
          >
            {isUndecided && <Check className="w-3 h-3 text-black" strokeWidth={4} />}
          </div>
          <span className="text-sm font-medium">아직 예약 안 함</span>
        </button>
      </div>

      {!isUndecided ? (
        <div className="space-y-6 animate-fadeInUp">
          {/* 출발/도착 공항 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="group">
              <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">
                Departure
              </label>
              <div className="relative">
                <select
                  name="originAirportCode"
                  value={userInput.flight.originAirportCode}
                  onChange={handleChange}
                  className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-4 appearance-none outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-lg cursor-pointer hover:border-slate-300"
                >
                  <option value="" disabled>
                    출발 공항
                  </option>
                  {ORIGIN_AIRPORTS.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">
                Arrival
              </label>
              <div className="relative">
                <select
                  name="destAirportCode"
                  value={userInput.flight.destAirportCode}
                  onChange={handleChange}
                  className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-4 appearance-none outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium text-lg cursor-pointer hover:border-slate-300"
                >
                  <option value="" disabled>
                    도착 공항
                  </option>
                  {ARRIVAL_AIRPORTS.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 일정 카드 */}
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
            <div className="space-y-6">
              {/* 가는 날 */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
                  <Plane className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Outbound</p>
                  <p className="font-bold text-lg text-slate-900">
                    {formatDateWithDay(departureDate)}
                  </p>
                </div>
                <div className="w-32">
                  <CustomTimePicker
                    selectedTime={userInput.flight.departureTime}
                    onChange={(time) => setFlightInput({ departureTime: time })}
                    placeholder="시간 선택"
                  />
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              {/* 오는 날 */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Plane className="w-5 h-5 rotate-180" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Inbound</p>
                  <p className="font-bold text-lg text-slate-900">
                    {formatDateWithDay(returnDate)}
                  </p>
                </div>
                <div className="w-32">
                  <CustomTimePicker
                    selectedTime={userInput.flight.returnTime}
                    onChange={(time) => setFlightInput({ returnTime: time })}
                    placeholder="시간 선택"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 가격 */}
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">
              Total Cost
            </label>
            <div className="relative group">
              <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-black transition-colors" />
              <input
                type="number"
                name="price"
                placeholder="왕복 항공권 비용 (선택)"
                value={userInput.flight.price || ''}
                onChange={handleChange}
                className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium hover:border-slate-300"
              />
              {userInput.flight.price > 0 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-100 px-2 py-1 rounded-lg">
                  <span className="text-sm font-bold text-slate-900">
                    {formatKoreanCurrency(userInput.flight.price)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center animate-fadeInUp">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-400">
            <Plane className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">AI가 항공편을 추천해드려요</h3>
          <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
            여행 일정과 예산에 맞춰 최적의 항공편을 찾아드립니다.
          </p>
        </div>
      )}
    </div>
  );
}
