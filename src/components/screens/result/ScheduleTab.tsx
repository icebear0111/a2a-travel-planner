'use client';

import React from 'react';
import { Star, EditIcon } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';

interface ScheduleTabProps {
  onNavigate: (screen: string) => void;
}

export default function ScheduleTab({ onNavigate }: ScheduleTabProps) {
  const { scheduleData, selectedDay, setSelectedDay, setSelectedActivityId } = useTripStore();

  const currentSchedule = scheduleData.find((d) => d.day === selectedDay);

  return (
    <div className="animate-fadeInUp">
      {/* 날짜 선택 */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        {scheduleData.map((day) => (
          <button
            key={day.day}
            onClick={() => setSelectedDay(day.day)}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border-2 transition-all ${
              selectedDay === day.day
                ? 'bg-black text-white border-black shadow-lg'
                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-medium opacity-70">Day</span>
            <span className="text-lg font-bold">{day.day}</span>
          </button>
        ))}
      </div>

      {/* 날짜 헤더 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-1">Day {selectedDay}</h2>
        <p className="text-slate-500">{currentSchedule?.theme}</p>
      </div>

      {/* 일정 리스트 */}
      <div className="space-y-0">
        {currentSchedule?.activities.length === 0 ? (
          <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            아직 일정이 없습니다. 아래 편집 버튼을 눌러 추가해보세요!
          </div>
        ) : (
          currentSchedule?.activities.map((item, index) => {
            const isLastItem = index === (currentSchedule?.activities.length || 0) - 1;

            return (
              <div
                key={item.id}
                className="flex gap-4 group cursor-pointer pb-6 last:pb-0"
                onClick={() => {
                  setSelectedActivityId(item.id);
                  onNavigate('detail');
                }}
              >
                {/* 시간 */}
                <div className="w-14 pt-1 text-right flex-shrink-0">
                  <span className="text-sm font-bold text-slate-900 block">{item.time}</span>
                  <span className="text-xs text-slate-400 block mt-0.5 font-medium">
                    {item.duration !== '-' ? item.duration : ''}
                  </span>
                </div>

                {/* 타임라인 */}
                <div className="relative flex flex-col items-center w-6 flex-shrink-0">
                  {!isLastItem && (
                    <div className="absolute top-4 bottom-[-24px] w-[2px] bg-slate-100" />
                  )}
                  <div className="relative z-10 w-3 h-3 rounded-full mt-2 ring-4 ring-white bg-black" />
                </div>

                {/* 카드 */}
                <div className="flex-1 min-w-0">
                  <div className="bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-300 hover:shadow-sm rounded-2xl p-4 transition-all duration-200">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-900 truncate pr-2">{item.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 bg-slate-100 text-slate-600 border border-slate-200">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1 mb-1">{item.desc}</p>
                    {item.type === 'sightseeing' && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mt-2">
                        <Star className="w-3 h-3 fill-current" /> 4.8 (1.2k)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 편집 버튼 */}
      <div className="mt-8 pb-8">
        <button
          onClick={() => onNavigate('edit')}
          className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 font-bold flex items-center justify-center gap-2 hover:bg-black hover:text-white hover:border-black transition-all"
        >
          <EditIcon className="w-5 h-5" /> 일정 편집
        </button>
      </div>
    </div>
  );
}
