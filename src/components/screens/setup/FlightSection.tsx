'use client';

import React from 'react';
import { Plane, Banknote, Check, ChevronDown } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { ORIGIN_AIRPORTS, ARRIVAL_AIRPORTS } from '@/constants/airports';
import { formatKoreanCurrency } from '@/lib/utils/format';
import CustomDatePicker from '@/components/ui/CustomDatePicker';
import CustomTimePicker from '@/components/ui/CustomTimePicker';

interface FlightSectionProps {
  isUndecided: boolean;
  onUndecidedChange: (value: boolean) => void;
}

export default function FlightSection({ isUndecided, onUndecidedChange }: FlightSectionProps) {
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
    <section className="mb-12">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
            <Plane className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold">항공권 정보</h2>
        </div>

        {/* 미정 체크박스 */}
        <label className="flex items-center gap-2 cursor-pointer group">
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
              isUndecided
                ? 'bg-black border-black'
                : 'bg-white border-slate-300 group-hover:border-slate-500'
            }`}
          >
            {isUndecided && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
          </div>
          <input
            type="checkbox"
            className="hidden"
            checked={isUndecided}
            onChange={(e) => onUndecidedChange(e.target.checked)}
          />
          <span
            className={`text-sm font-medium transition-colors ${
              isUndecided ? 'text-black' : 'text-slate-500'
            }`}
          >
            아직 예약 안 함
          </span>
        </label>
      </div>

      {!isUndecided ? (
        <div className="space-y-5 animate-fadeInUp">
          {/* 출발지 & 도착지 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 출발지 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 ml-1">출발지</label>
              <div className="relative">
                <select
                  name="originAirportCode"
                  value={userInput.flight.originAirportCode}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 pr-10 text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black/10 focus:bg-white transition-all appearance-none outline-none cursor-pointer"
                >
                  <option value="" disabled>
                    출발 공항 선택
                  </option>
                  {ORIGIN_AIRPORTS.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 도착지 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 ml-1">도착지</label>
              <div className="relative">
                <select
                  name="destAirportCode"
                  value={userInput.flight.destAirportCode}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 pr-10 text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black/10 focus:bg-white transition-all appearance-none outline-none cursor-pointer"
                >
                  <option value="" disabled>
                    도착 공항 선택
                  </option>
                  {ARRIVAL_AIRPORTS.map((airport) => (
                    <option key={airport.code} value={airport.code}>
                      {airport.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 가는 날 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              가는 날
            </div>
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <CustomDatePicker
                  selectedDate={userInput.flight.departureDate}
                  onChange={(date) => setFlightInput({ departureDate: date })}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div className="col-span-2">
                <CustomTimePicker
                  selectedTime={userInput.flight.departureTime}
                  onChange={(time) => setFlightInput({ departureTime: time })}
                  placeholder="HH:MM"
                />
              </div>
            </div>
          </div>

          {/* 오는 날 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              오는 날
            </div>
            <div className="grid grid-cols-5 gap-3">
              <div className="col-span-3">
                <CustomDatePicker
                  selectedDate={userInput.flight.returnDate}
                  onChange={(date) => setFlightInput({ returnDate: date })}
                  placeholder="YYYY-MM-DD"
                  minDate={
                    userInput.flight.departureDate
                      ? new Date(userInput.flight.departureDate)
                      : undefined
                  }
                />
              </div>
              <div className="col-span-2">
                <CustomTimePicker
                  selectedTime={userInput.flight.returnTime}
                  onChange={(time) => setFlightInput({ returnTime: time })}
                  placeholder="HH:MM"
                />
              </div>
            </div>
          </div>

          {/* 가격 */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 ml-1">왕복 비용</label>
            <div className="relative">
              <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="number"
                name="price"
                placeholder="0"
                value={userInput.flight.price || ''}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black/10 transition-all placeholder:text-slate-400 outline-none"
              />
            </div>
            {userInput.flight.price > 0 && (
              <p className="text-xs text-blue-600 font-medium text-right px-1">
                {formatKoreanCurrency(userInput.flight.price)}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* 미정 상태 */
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center animate-fadeInUp">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-400">
            <Plane className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-900 mb-1">항공권/일정을 추천해 드릴까요?</p>
          <p className="text-xs text-slate-500">
            AI가 가장 적절한 여행 시기와 항공편을 제안해 드립니다.
          </p>
        </div>
      )}
    </section>
  );
}

