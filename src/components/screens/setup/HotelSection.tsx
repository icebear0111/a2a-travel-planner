'use client';

import React from 'react';
import { Building, Plus, Trash2, Banknote, Check } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { formatKoreanCurrency } from '@/lib/utils/format';
import CustomDatePicker from '@/components/ui/CustomDatePicker';

interface HotelSectionProps {
  isUndecided: boolean;
  onUndecidedChange: (value: boolean) => void;
}

export default function HotelSection({ isUndecided, onUndecidedChange }: HotelSectionProps) {
  const { userInput, addHotel, removeHotel, updateHotel } = useTripStore();

  const handleChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
      updateHotel(id, { [name]: Number(value) });
    } else {
      updateHotel(id, { [name]: value });
    }
  };

  return (
    <section>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold">숙소 정보</h2>
        </div>

        <div className="flex items-center gap-3">
          {!isUndecided && (
            <button
              onClick={addHotel}
              className="flex items-center gap-1.5 bg-black border hover:bg-slate-800 text-white px-3 py-1.5 rounded-full text-xs font-bold transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          )}

          {!isUndecided && <div className="w-px h-4 bg-slate-200" />}

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
              예약 안 함
            </span>
          </label>
        </div>
      </div>

      {!isUndecided ? (
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
                onChange={(e) => handleChange(hotel.id, e)}
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
                    onChange={(e) => handleChange(hotel.id, e)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black/10 transition-all placeholder:text-slate-400 outline-none"
                  />
                </div>
                {hotel.price > 0 && (
                  <p className="text-xs text-blue-600 font-medium text-right px-1">
                    {formatKoreanCurrency(hotel.price)}
                  </p>
                )}
              </div>

              {index < userInput.hotels.length - 1 && <div className="h-px bg-slate-100 mt-8" />}
            </div>
          ))}
        </div>
      ) : (
        /* 미정 상태 */
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
  );
}

