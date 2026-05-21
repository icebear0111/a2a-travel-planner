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
    <div className="w-full max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">숙소 정보</h2>

        <div className="flex items-center gap-3">
          {!isUndecided && (
            <button
              onClick={addHotel}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-black/20"
            >
              <Plus className="w-4 h-4" />
              숙소 추가
            </button>
          )}

          <button
            onClick={() => onUndecidedChange(!isUndecided)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
              isUndecided
                ? 'bg-black text-white shadow-lg shadow-black/20'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              isUndecided ? 'border-white bg-white' : 'border-slate-300'
            }`}>
              {isUndecided && <Check className="w-3 h-3 text-black" strokeWidth={4} />}
            </div>
            <span className="text-sm font-medium">예약 안 함</span>
          </button>
        </div>
      </div>

      {!isUndecided ? (
        <div className="space-y-6 animate-fadeInUp">
          {userInput.hotels.length === 0 && (
            <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
              <p>우측 상단의 &apos;숙소 추가&apos; 버튼을 눌러주세요.</p>
            </div>
          )}

          {userInput.hotels.map((hotel, index) => (
            <div 
              key={hotel.id} 
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group"
            >
              {userInput.hotels.length > 1 && (
                <button
                  onClick={() => removeHotel(hotel.id)}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">
                    Hotel #{index + 1}
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="숙소 이름을 입력해주세요"
                    value={hotel.name}
                    onChange={(e) => handleChange(hotel.id, e)}
                    className="w-full text-xl font-bold placeholder:font-normal placeholder:text-slate-300 border-none p-0 focus:ring-0 bg-transparent transition-all"
                  />
                  <div className="h-px bg-slate-100 mt-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">Check-in</label>
                    <CustomDatePicker
                      selectedDate={hotel.checkIn}
                      onChange={(date) => updateHotel(hotel.id, { checkIn: date })}
                      placeholder="날짜 선택"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">Check-out</label>
                    <CustomDatePicker
                      selectedDate={hotel.checkOut}
                      onChange={(date) => updateHotel(hotel.id, { checkOut: date })}
                      placeholder="날짜 선택"
                      minDate={hotel.checkIn ? new Date(hotel.checkIn) : undefined}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">Cost</label>
                  <div className="relative group/input">
                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-black transition-colors" />
                    <input
                      type="number"
                      name="price"
                      placeholder="숙박 비용 (선택)"
                      value={hotel.price || ''}
                      onChange={(e) => handleChange(hotel.id, e)}
                      className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black transition-all font-medium hover:border-slate-300"
                    />
                    {hotel.price > 0 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white border border-slate-100 px-2 py-1 rounded-lg shadow-sm">
                        <span className="text-sm font-bold text-slate-900">
                          {formatKoreanCurrency(hotel.price)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center animate-fadeInUp">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-400">
            <Building className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">AI가 숙소를 추천해드려요</h3>
          <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
            여행 동선을 고려하여 가장 편리한 위치의 숙소를 찾아드립니다.
          </p>
        </div>
      )}
    </div>
  );
}
