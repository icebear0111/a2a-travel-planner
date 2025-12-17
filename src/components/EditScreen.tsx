'use client';

import React, { useState } from 'react';
import {
  X,
  Check,
  Plus,
  GripVertical,
  Trash2,
  MapPin,
  Utensils,
  Coffee,
  Camera,
  Train,
} from 'lucide-react';
import { initialScheduleData } from '@/data/dummyData'; // 데이터 가져오기

interface EditScreenProps {
  onBack: () => void;
}

export default function EditScreen({ onBack }: EditScreenProps) {
  // Day 1 데이터만 가져와서 편집 상태로 관리 (예시)
  const [items, setItems] = useState(initialScheduleData[0].activities);

  // 항목 삭제 핸들러
  const handleDelete = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-white font-body text-slate-900 pb-20">
      {/* 1. 헤더 (고정) */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-500 hover:text-black transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">Edit Schedule</h1>
          <button
            onClick={onBack}
            className="p-2 -mr-2 text-black hover:bg-slate-100 rounded-full transition-colors"
          >
            <Check className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {/* 2. 날짜 선택 (가로 스크롤) */}
        <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide mb-2">
          {[1, 2, 3, 4, 5].map((day) => (
            <button
              key={day}
              className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold border transition-all ${
                day === 1
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>

        {/* 3. 편집 리스트 영역 */}
        <div className="space-y-3 mb-8">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:border-slate-400 transition-all"
            >
              {/* 드래그 핸들 */}
              <div className="text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 p-1">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* 시간 입력 */}
              <div className="w-16">
                <input
                  type="text"
                  defaultValue={item.time}
                  className="w-full text-sm font-bold text-slate-900 bg-slate-50 border-transparent rounded-lg py-1 px-2 text-center focus:bg-white focus:ring-2 focus:ring-black focus:outline-none transition-all"
                />
              </div>

              {/* 내용 입력 */}
              <div className="flex-1">
                <input
                  type="text"
                  defaultValue={item.title}
                  className="w-full font-medium text-slate-900 bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-400"
                  placeholder="Activity Name"
                />
                <input
                  type="text"
                  defaultValue={item.type} // 실제로는 Select 박스가 좋겠지만 심플하게 텍스트로
                  className="w-full text-xs text-slate-400 bg-transparent border-none p-0 focus:ring-0 uppercase tracking-wide mt-0.5"
                />
              </div>

              {/* 삭제 버튼 */}
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* 4. 추가 버튼 & 빠른 액션 */}
        <div className="space-y-6">
          <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium flex items-center justify-center gap-2 hover:border-slate-400 hover:text-slate-600 transition-all group">
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Add New Activity
          </button>

          {/* 빠른 추가 칩 (Quick Add Chips) */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-1">
              Quick Add
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Utensils, label: 'Restaurant' },
                { icon: Coffee, label: 'Cafe' },
                { icon: Camera, label: 'Spot' },
                { icon: MapPin, label: 'Location' },
                { icon: Train, label: 'Transport' },
              ].map((chip, i) => (
                <button
                  key={i}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-black hover:text-white hover:border-black transition-all"
                >
                  <chip.icon className="w-4 h-4" />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
