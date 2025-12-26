'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MapPin, Navigation, RefreshCcw } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

export default function MapTab() {
  const { scheduleData, selectedDay, setSelectedDay, userInput } = useTripStore();
  const [focusedActivityId, setFocusedActivityId] = useState<string | null>(null);

  const currentSchedule = scheduleData.find((d) => d.day === selectedDay);

  // 날짜 변경 시 포커스 초기화
  useEffect(() => {
    setFocusedActivityId(null);
  }, [selectedDay]);

  // 구글 맵 URL 생성
  const mapUrls = useMemo(() => {
    if (!currentSchedule || currentSchedule.activities.length === 0 || !userInput.destination) {
      return { embed: '', external: '' };
    }

    const formatPlace = (input: { title: string; location?: string } | string) => {
      let placeName = '';
      let contextLocation = userInput.destination;

      if (typeof input === 'string') {
        placeName = input;
      } else {
        placeName = input.title;
        if (input.location) contextLocation = input.location;
      }

      if (!placeName) return contextLocation;
      if (placeName.includes(contextLocation)) return placeName;
      return `${placeName}, ${contextLocation}`;
    };

    // 특정 장소 선택 모드
    if (focusedActivityId) {
      const activity = currentSchedule.activities.find((a) => a.id === focusedActivityId);
      if (activity) {
        const query = encodeURIComponent(formatPlace(activity));
        return {
          embed: `https://www.google.com/maps/embed/v1/search?key=${GOOGLE_API_KEY}&q=${query}&zoom=15`,
          external: `https://www.google.com/maps/search/?api=1&query=${query}`,
        };
      }
    }

    // 전체 경로 모드
    const firstActivity = currentSchedule.activities[0];
    const origin = encodeURIComponent(formatPlace(firstActivity));

    const lastActivity = currentSchedule.activities[currentSchedule.activities.length - 1];
    const destination = encodeURIComponent(formatPlace(lastActivity));

    const waypoints = currentSchedule.activities
      .slice(1, currentSchedule.activities.length - 1)
      .map((item) => formatPlace(item))
      .join('|');

    const encWaypoints = encodeURIComponent(waypoints);
    const mode = 'transit';

    return {
      embed: `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_API_KEY}&origin=${origin}&destination=${destination}&waypoints=${encWaypoints}&mode=${mode}`,
      external: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encWaypoints}&travelmode=${mode}`,
    };
  }, [currentSchedule, userInput.destination, focusedActivityId]);

  return (
    <div className="animate-fadeInUp space-y-4">
      {/* 날짜 선택 */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {scheduleData.map((day) => (
          <button
            key={day.day}
            onClick={() => setSelectedDay(day.day)}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border transition-all ${
              selectedDay === day.day
                ? 'bg-black text-white border-black shadow-md transform scale-105'
                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-medium">Day</span>
            <span className="text-lg font-bold">{day.day}</span>
          </button>
        ))}
      </div>

      {/* 경로 정보 */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold">
            {focusedActivityId ? '선택된 장소' : `Day ${selectedDay} 전체 경로`}
          </h3>
          {focusedActivityId && (
            <button
              onClick={() => setFocusedActivityId(null)}
              className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-full transition-colors"
            >
              <RefreshCcw className="w-3 h-3" />
              전체 경로 보기
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {currentSchedule?.activities.map((item, index) => {
            const isLast = index === currentSchedule.activities.length - 1;
            const isSelected = focusedActivityId === item.id;

            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => setFocusedActivityId(isSelected ? null : item.id)}
                  className={`font-medium px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-black text-white border-black shadow-md ring-2 ring-offset-1 ring-black/20'
                      : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400 hover:shadow-sm'
                  }`}
                >
                  {item.title}
                </button>
                {!isLast && <span className="text-slate-300">→</span>}
              </React.Fragment>
            );
          })}

          {currentSchedule?.activities.length === 0 && (
            <span className="text-slate-400 text-xs ml-2">(일정이 없습니다)</span>
          )}
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="bg-slate-100 rounded-3xl h-[500px] relative overflow-hidden flex items-center justify-center border border-slate-200 shadow-inner">
        {GOOGLE_API_KEY && currentSchedule && currentSchedule.activities.length > 0 ? (
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={mapUrls.embed}
            title="Google Maps"
            className="transition-opacity duration-500 opacity-100"
          />
        ) : (
          <div className="text-center p-6">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium mb-1">
              {!GOOGLE_API_KEY
                ? '지도를 불러오려면 Google Maps API 키가 필요합니다.'
                : '표시할 장소가 없습니다.'}
            </p>
          </div>
        )}

        <a
          href={mapUrls.external}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black text-white px-6 py-3 rounded-full font-medium shadow-lg hover:scale-105 transition-transform flex items-center gap-2 z-10 whitespace-nowrap"
        >
          <Navigation className="w-4 h-4" />
          {focusedActivityId ? '이 장소 자세히 보기' : '전체 경로 길찾기'}
        </a>
      </div>
    </div>
  );
}

