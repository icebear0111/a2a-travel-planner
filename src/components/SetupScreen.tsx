'use client';

import React, { useState } from 'react';
import Header from './Header';
import {
  ArrowRight,
  Plane,
  Building,
  Plus,
  Trash2,
  Banknote,
  Check,
  ChevronDown,
} from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { ORIGIN_AIRPORTS, ARRIVAL_AIRPORTS } from '@/data/dummyData';
import CustomDatePicker from './CustomDatePicker';
import CustomTimePicker from './CustomTimePicker';

interface SetupScreenProps {
  onBack: () => void;
  onNext: () => void;
}

export default function SetupScreen({ onBack, onNext }: SetupScreenProps) {
  const {
    userInput,
    setFlightInput,
    addHotel,
    removeHotel,
    updateHotel,
    generateTrip,
    setUserInput,
  } = useTripStore();

  const [isFlightUndecided, setIsFlightUndecided] = useState(false);
  const [isHotelUndecided, setIsHotelUndecided] = useState(false);

  // 핸들러 (항공권)
  const handleFlightChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
      setFlightInput({ [name]: Number(value) });
    } else {
      setFlightInput({ [name]: value });
    }
  };

  // 핸들러 (숙소)
  const handleHotelChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
      updateHotel(id, { [name]: Number(value) });
    } else {
      updateHotel(id, { [name]: value });
    }
  };

  // 제출 버튼
  const handleSubmit = () => {
    // 1. 항공권 '확정' 상태인데 날짜가 비어있으면 경고
    // [수정] 변수명: departureDate(가는날), returnDate(오는날)
    if (!isFlightUndecided && (!userInput.flight.departureDate || !userInput.flight.returnDate)) {
      alert('항공권의 가는 날/오는 날짜를 입력해주세요.');
      return;
    }

    // 2. 미정 시 데이터 초기화 (변수명 스토어와 일치시킴)
    if (isFlightUndecided) {
      setFlightInput({
        originAirportCode: '', // 출발지
        destAirportCode: '', // 도착지
        price: 0,
        departureDate: '', // 가는 날
        departureTime: '',
        returnDate: '', // 오는 날
        returnTime: '',
      });
    }

    if (isHotelUndecided) {
      setUserInput({ ...userInput, hotels: [] });
    }

    onNext();
    generateTrip();
  };

  // 금액 한글 변환
  const formatKoreanCurrency = (price: number) => {
    if (!price) return '';
    const unit = 10000;
    if (price < unit) return `${price.toLocaleString()}원`;
    const man = Math.floor(price / unit);
    const remainder = price % unit;
    return remainder > 0
      ? `${man.toLocaleString()}만 ${remainder.toLocaleString()}원`
      : `${man.toLocaleString()}만원`;
  };

  return (
    <div className="min-h-screen bg-white font-body text-slate-900">
      <Header showBack onBack={onBack} />

      <main className="max-w-2xl mx-auto px-6 pt-10 pb-32">
        {/* ========================================= */}
        {/* ✈️ 항공권 섹션 */}
        {/* ========================================= */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
                <Plane className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">항공권 정보</h2>
            </div>

            {/* 항공권 미정 체크박스 */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  isFlightUndecided
                    ? 'bg-black border-black'
                    : 'bg-white border-slate-300 group-hover:border-slate-500'
                }`}
              >
                {isFlightUndecided && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={isFlightUndecided}
                onChange={(e) => setIsFlightUndecided(e.target.checked)}
              />
              <span
                className={`text-sm font-medium transition-colors ${
                  isFlightUndecided ? 'text-black' : 'text-slate-500'
                }`}
              >
                아직 예약 안 함
              </span>
            </label>
          </div>

          {!isFlightUndecided ? (
            <div className="space-y-5 animate-fadeInUp">
              {/* 출발지 & 도착지 (Select Box) */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. 출발지 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 ml-1">출발지 (Origin)</label>
                  <div className="relative">
                    <select
                      name="originAirportCode" // [수정] 변수명 변경
                      value={userInput.flight.originAirportCode} // [수정] 변수명 변경
                      onChange={handleFlightChange}
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

                {/* 2. 도착지 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 ml-1">도착지 (Dest)</label>
                  <div className="relative">
                    <select
                      name="destAirportCode" // [수정] 변수명 변경
                      value={userInput.flight.destAirportCode} // [수정] 변수명 변경
                      onChange={handleFlightChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 pr-10 text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black/10 focus:bg-white transition-all appearance-none outline-none cursor-pointer"
                    >
                      <option value="" disabled>
                        도착 공항 선택
                      </option>
                      {/* AIRPORTS 또는 ARRIVAL_AIRPORTS 사용 */}
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

              {/* 가는 날 (Departure) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  가는 날
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-3">
                    <CustomDatePicker
                      selectedDate={userInput.flight.departureDate} // [수정] arrivalDate -> departureDate
                      onChange={(date) => setFlightInput({ departureDate: date })}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div className="col-span-2">
                    <CustomTimePicker
                      selectedTime={userInput.flight.departureTime} // [수정] arrivalTime -> departureTime
                      onChange={(time) => setFlightInput({ departureTime: time })}
                      placeholder="HH:MM"
                    />
                  </div>
                </div>
              </div>

              {/* 오는 날 (Return) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  오는 날
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-3">
                    <CustomDatePicker
                      selectedDate={userInput.flight.returnDate} // [수정] departureDate -> returnDate
                      onChange={(date) => setFlightInput({ returnDate: date })}
                      placeholder="YYYY-MM-DD"
                      // minDate는 가는 날(departureDate) 이후여야 함
                      minDate={
                        userInput.flight.departureDate
                          ? new Date(userInput.flight.departureDate)
                          : undefined
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <CustomTimePicker
                      selectedTime={userInput.flight.returnTime} // [수정] departureTime -> returnTime
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
                    onChange={handleFlightChange}
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
            // [항공권 미정]
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center animate-fadeInUp">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-400">
                <Plane className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">
                항공권/일정을 추천해 드릴까요?
              </p>
              <p className="text-xs text-slate-500">
                AI가 가장 적절한 여행 시기와 항공편을 제안해 드립니다.
              </p>
            </div>
          )}
        </section>

        <div className="h-px bg-slate-100 mb-12" />

        {/* ========================================= */}
        {/* 🏨 숙소 섹션 (변수명 변경 없음) */}
        {/* ========================================= */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">숙소 정보</h2>
            </div>

            <div className="flex items-center gap-3">
              {!isHotelUndecided && (
                <button
                  onClick={addHotel}
                  className="flex items-center gap-1.5 bg-black border hover:bg-slate-800 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              )}

              {!isHotelUndecided && <div className="w-px h-4 bg-slate-200" />}

              <label className="flex items-center gap-2 cursor-pointer group">
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    isHotelUndecided
                      ? 'bg-black border-black'
                      : 'bg-white border-slate-300 group-hover:border-slate-500'
                  }`}
                >
                  {isHotelUndecided && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={isHotelUndecided}
                  onChange={(e) => setIsHotelUndecided(e.target.checked)}
                />
                <span
                  className={`text-sm font-medium transition-colors ${
                    isHotelUndecided ? 'text-black' : 'text-slate-500'
                  }`}
                >
                  예약 안 함
                </span>
              </label>
            </div>
          </div>

          {!isHotelUndecided ? (
            <div className="space-y-8 animate-fadeInUp">
              {userInput.hotels.length === 0 && (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm">
                  우측 상단의 Add 버튼을 눌러 숙소를 추가해주세요.
                </div>
              )}

              {userInput.hotels.map((hotel, index) => (
                <div key={hotel.id} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
                    {userInput.hotels.length > 0 && (
                      <button
                        onClick={() => removeHotel(hotel.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    name="name"
                    placeholder="Hotel name"
                    value={hotel.name}
                    onChange={(e) => handleHotelChange(hotel.id, e)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black/10 focus:bg-white transition-all placeholder:text-slate-400"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500 ml-1">체크인</label>
                      <CustomDatePicker
                        selectedDate={hotel.checkIn}
                        onChange={(date) => updateHotel(hotel.id, { checkIn: date })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-500 ml-1">체크아웃</label>
                      <CustomDatePicker
                        selectedDate={hotel.checkOut}
                        onChange={(date) => updateHotel(hotel.id, { checkOut: date })}
                        minDate={hotel.checkIn ? new Date(hotel.checkIn) : undefined}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 ml-1">비용</label>
                    <div className="relative">
                      <Banknote className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="number"
                        name="price"
                        placeholder="0"
                        value={hotel.price || ''}
                        onChange={(e) => handleHotelChange(hotel.id, e)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black/10 transition-all placeholder:text-slate-400 outline-none"
                      />
                    </div>
                    {hotel.price > 0 && (
                      <p className="text-xs text-blue-600 font-medium text-right px-1">
                        {formatKoreanCurrency(hotel.price)}
                      </p>
                    )}
                  </div>

                  {index < userInput.hotels.length - 1 && (
                    <div className="h-px bg-slate-100 mt-8" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            // [숙소 미정]
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center animate-fadeInUp">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-slate-400">
                <Building className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900 mb-1">숙소를 추천해 드릴까요?</p>
              <p className="text-xs text-slate-500">
                AI가 예산과 동선에 맞는 최적의 숙소를 제안합니다.
              </p>
            </div>
          )}
        </section>
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
