'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  Share2,
  Heart,
  Calendar,
  MapPin,
  Navigation,
  Star,
  Plane,
  Hotel,
  Utensils,
  ShoppingBag,
  Ticket,
  CreditCard,
  Map,
  RefreshCcw,
  EditIcon,
} from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

interface ResultScreenProps {
  setCurrentScreen: (screen: string) => void;
}

export default function ResultScreen({ setCurrentScreen }: ResultScreenProps) {
  const {
    tripData,
    scheduleData,
    budgetData,
    selectedDay,
    setSelectedDay,
    setSelectedActivityId,
    userInput,
  } = useTripStore();

  const [activeTab, setActiveTab] = useState<'schedule' | 'map' | 'budget'>('schedule');
  const [isSaved, setIsSaved] = useState(false);
  const [focusedActivityId, setFocusedActivityId] = useState<string | null>(null);

  const currentSchedule = scheduleData.find((d) => d.day === selectedDay);

  useEffect(() => {
    setFocusedActivityId(null);
  }, [selectedDay]);

  // 📍 [수정] 구글 맵 URL 생성 로직
  const mapUrls = useMemo(() => {
    if (!currentSchedule || currentSchedule.activities.length === 0 || !userInput.destination) {
      return { embed: '', external: '' };
    }

    const formatPlace = (input: any) => {
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

    // 🅰️ 특정 장소 선택 (Search Mode)
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

    // 🅱️ 전체 경로 모드 (Directions Mode)

    // 1. 출발지 (Origin): 이제 무조건 '첫 번째 일정'입니다. (숙소 X)
    const firstActivity = currentSchedule.activities[0];
    const origin = encodeURIComponent(formatPlace(firstActivity));

    // 2. 도착지 (Destination): '마지막 일정'
    const lastActivity = currentSchedule.activities[currentSchedule.activities.length - 1];
    const destination = encodeURIComponent(formatPlace(lastActivity));

    // 3. 경유지 (Waypoints): 첫 번째와 마지막을 제외한 중간 일정들
    const waypoints = currentSchedule.activities
      .slice(1, currentSchedule.activities.length - 1) // index 1 ~ 마지막 전까지
      .map((item) => formatPlace(item))
      .join('|');

    const encWaypoints = encodeURIComponent(waypoints);

    // 시내 관광 줌인 최적화를 위해 transit 사용 (상황에 따라 walking 고려 가능)
    const mode = 'transit';

    return {
      embed: `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_API_KEY}&origin=${origin}&destination=${destination}&waypoints=${encWaypoints}&mode=${mode}`,
      external: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encWaypoints}&travelmode=${mode}`,
    };
  }, [currentSchedule, userInput.destination, focusedActivityId]);

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* 1. 헤더 (변경 없음) */}
      <div className="relative h-64 md:h-80 w-full">
        <Image
          src={tripData.image}
          alt={tripData.title}
          fill
          className="object-cover"
          priority
          unoptimized={true}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10">
          <button
            onClick={() => setCurrentScreen('home')}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                isSaved ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setCurrentScreen('share')}
              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <span className="inline-block px-3 py-1 bg-black/30 backdrop-blur-md border border-white/20 rounded-full text-xs font-medium mb-3">
            {tripData.days} Days Trip
          </span>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-1">{tripData.title}</h1>
          <p className="text-white/80 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" /> {tripData.dates}
          </p>
        </div>
      </div>

      {/* 2. 탭 네비게이션 */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-3xl mx-auto flex">
          {[
            { id: 'schedule', label: '일정', icon: Calendar },
            { id: 'map', label: '지도', icon: Map },
            { id: 'budget', label: '예산', icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'schedule' | 'map' | 'budget')}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-black text-black'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        {/* 탭 1: 일정표 (변경 없음) */}
        {activeTab === 'schedule' && (
          <div className="animate-fadeInUp">
            <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide">
              {scheduleData.map((day) => (
                <button
                  key={day.day}
                  onClick={() => setSelectedDay(day.day)}
                  className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all ${
                    selectedDay === day.day
                      ? 'bg-black text-white border-black shadow-lg transform scale-105'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-medium">Day</span>
                  <span className="text-xl font-bold">{day.day}</span>
                </button>
              ))}
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1">Day {selectedDay}</h2>
              <p className="text-slate-500">{currentSchedule?.theme}</p>
            </div>

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
                        setCurrentScreen('detail');
                      }}
                    >
                      <div className="w-14 pt-1 text-right flex-shrink-0">
                        <span className="text-sm font-bold text-slate-900 block">{item.time}</span>
                        <span className="text-xs text-slate-400 block mt-0.5 font-medium">
                          {item.duration !== '-' ? item.duration : ''}
                        </span>
                      </div>
                      <div className="relative flex flex-col items-center w-6 flex-shrink-0">
                        {!isLastItem && (
                          <div className="absolute top-4 bottom-[-24px] w-[2px] bg-slate-100" />
                        )}
                        <div className="relative z-10 w-3 h-3 rounded-full mt-2 ring-4 ring-white bg-black" />
                      </div>
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
            <div className="mt-8 pb-8">
              <button
                onClick={() => setCurrentScreen('edit')}
                className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 font-bold flex items-center justify-center gap-2 hover:bg-black hover:text-white hover:border-black transition-all"
              >
                <EditIcon className="w-5 h-5" /> 일정 편집
              </button>
            </div>
          </div>
        )}

        {/* 🗺️ 탭 2: 지도 (수정됨) */}
        {activeTab === 'map' && (
          <div className="animate-fadeInUp space-y-4">
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
                {/* 👇 [삭제됨] 숙소(출발지) 뱃지 제거 */}

                {/* 일정 아이템 버튼들 */}
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

            {/* 지도 Iframe 영역 */}
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
        )}

        {/* 탭 3: 예산 (변경 없음) */}
        {activeTab === 'budget' && (
          <div className="animate-fadeInUp space-y-6">
            <div className="bg-black text-white rounded-3xl p-8 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
              <p className="text-white/60 text-sm mb-1 font-medium">총 예산 (1인 기준)</p>
              <h2 className="text-4xl font-bold tracking-tight">
                ₩{budgetData.total.toLocaleString()}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgetData.breakdown.map((item, i) => {
                let IconComponent = Map;
                switch (item.category) {
                  case '항공':
                    IconComponent = Plane;
                    break;
                  case '숙소':
                    IconComponent = Hotel;
                    break;
                  case '식비':
                    IconComponent = Utensils;
                    break;
                  case '쇼핑':
                    IconComponent = ShoppingBag;
                    break;
                  case '관광':
                    IconComponent = Ticket;
                    break;
                  case '기타':
                    IconComponent = CreditCard;
                    break;
                  default:
                    IconComponent = Map;
                    break;
                }

                return (
                  <div
                    key={i}
                    className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-black shadow-sm">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{item.category}</p>
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <p className="text-xl font-bold text-slate-900">
                        ₩{item.amount.toLocaleString()}
                      </p>
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                        <div
                          className="h-full bg-black rounded-full"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
