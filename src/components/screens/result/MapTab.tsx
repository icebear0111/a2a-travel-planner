'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  RefreshCcw,
  Plane,
  Train,
  Hotel,
  Camera,
  Utensils,
  ShoppingBag,
  Coffee,
  Moon,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Route,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { Activity } from '@/types/trip';
import { buildDayMapUrls } from '@/lib/utils/mapUrls';
import {
  TravelSegmentQuality,
  calculateRouteQuality,
  formatDistance,
  formatTravelMinutes,
} from '@/lib/utils/routeQuality';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

// 활동 타입별 스타일 정의
const ACTIVITY_STYLES: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  flight: { icon: Plane, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: '항공' },
  transport: {
    icon: Train,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    label: '이동',
  },
  hotel: {
    icon: Hotel,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    label: '숙소',
  },
  sightseeing: {
    icon: Camera,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    label: '관광',
  },
  food: {
    icon: Utensils,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    label: '식사',
  },
  shopping: {
    icon: ShoppingBag,
    color: 'text-pink-600',
    bg: 'bg-pink-50 border-pink-200',
    label: '쇼핑',
  },
  cafe: {
    icon: Coffee,
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    label: '카페',
  },
  coffee: {
    icon: Coffee,
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    label: '카페',
  },
  nightlife: {
    icon: Moon,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200',
    label: '야간',
  },
  etc: { icon: MapPin, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', label: '기타' },
};

function getActivityStyle(type: string) {
  return ACTIVITY_STYLES[type] || ACTIVITY_STYLES.etc;
}

const ROUTE_LEVEL_STYLES = {
  excellent: {
    label: '짧음',
    card: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  good: {
    label: '보통',
    card: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
  },
  busy: {
    label: '김',
    card: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  unknown: {
    label: '대기',
    card: 'border-slate-200 bg-slate-50 text-slate-500',
    dot: 'bg-slate-300',
    bar: 'bg-slate-300',
  },
};

const ROUTE_SOURCE_LABELS: Record<TravelSegmentQuality['source'], string> = {
  directions: '검증',
  coordinates: '좌표 추정',
  schedule: '시간표 추정',
  locality: '지역 추정',
  unknown: '대기',
};

// 활동 카드 컴포넌트
function ActivityCard({
  activity,
  index,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  isLast,
  travelSegment,
}: {
  activity: Activity;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  isLast: boolean;
  travelSegment?: TravelSegmentQuality;
}) {
  const style = getActivityStyle(activity.type);
  const Icon = style.icon;
  const segmentStyle = travelSegment ? ROUTE_LEVEL_STYLES[travelSegment.level] : null;
  const travelMinutes =
    travelSegment?.minutes !== null && travelSegment?.minutes !== undefined
      ? formatTravelMinutes(travelSegment.minutes)
      : travelSegment?.timeText;
  const travelDistance =
    travelSegment?.distanceText || formatDistance(travelSegment?.distanceMeters ?? null);
  const segmentMeta =
    travelSegment && travelSegment.minutes !== null
      ? `${ROUTE_SOURCE_LABELS[travelSegment.source]} · ${segmentStyle?.label || '대기'}`
      : '대기';

  return (
    <div className="relative">
      {/* 타임라인 연결선 */}
      {!isLast && (
        <div className="absolute left-5 top-14 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 to-slate-100 z-0" />
      )}

      <div
        className={`relative z-10 transition-all duration-300 ${isSelected ? 'scale-[1.02]' : ''}`}
      >
        <div
          onClick={onSelect}
          className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
            isSelected
              ? 'bg-black text-white border-black shadow-lg'
              : `${style.bg} hover:shadow-md hover:scale-[1.01]`
          }`}
        >
          {/* 순서 번호 + 아이콘 */}
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              isSelected ? 'bg-white text-black' : `bg-white ${style.color} shadow-sm`
            }`}
          >
            {index + 1}
          </div>

          {/* 메인 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white' : style.color}`}
              />
              <h4
                className={`font-semibold text-sm truncate ${
                  isSelected ? 'text-white' : 'text-slate-900'
                }`}
              >
                {activity.title}
              </h4>
            </div>

            <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
              <Clock className="w-3 h-3 inline mr-0.5" />
              {activity.time} · {activity.duration}
            </span>

            {/* 확장된 상세 정보 */}
            {isExpanded && (
              <div
                className={`mt-2 pt-2 border-t text-xs space-y-1.5 animate-fadeIn ${
                  isSelected ? 'border-white/20 text-white/80' : 'border-slate-200 text-slate-600'
                }`}
              >
                <p>{activity.desc}</p>
                <div className="flex items-center justify-between">
                  <span>⏱ {activity.duration}</span>
                  {activity.price !== undefined && activity.price > 0 && (
                    <span className="font-medium">₩{activity.price.toLocaleString()}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 확장 토글 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
              isSelected ? 'hover:bg-white/20' : 'hover:bg-black/5'
            }`}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isLast && travelSegment && (
        <div className="ml-[52px] mt-2 mb-1">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              segmentStyle?.card || ROUTE_LEVEL_STYLES.unknown.card
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                segmentStyle?.dot || ROUTE_LEVEL_STYLES.unknown.dot
              }`}
            />
            <span>
              다음 이동 {travelMinutes || '검증 대기'}
              {travelDistance ? ` · ${travelDistance}` : ''}
            </span>
            <span className="font-bold">{segmentMeta}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MapTab() {
  const { scheduleData, selectedDay, setSelectedDay, userInput } = useTripStore();
  const selectedDayRef = useRef(selectedDay);

  useEffect(() => {
    selectedDayRef.current = selectedDay;
  }, [selectedDay]);

  const [mapState, setMapState] = useState<{
    selectedDay: number;
    focusedActivityId: string | null;
    expandedActivityId: string | null;
    isMapLoading: boolean;
  }>({
    selectedDay,
    focusedActivityId: null,
    expandedActivityId: null,
    isMapLoading: true,
  });

  const isMapStateStale = mapState.selectedDay !== selectedDay;
  const focusedActivityId = isMapStateStale ? null : mapState.focusedActivityId;
  const expandedActivityId = isMapStateStale ? null : mapState.expandedActivityId;
  const isMapLoading = isMapStateStale ? true : mapState.isMapLoading;

  const currentSchedule = scheduleData.find((d) => d.day === selectedDay);
  const routeQuality = useMemo(() => calculateRouteQuality(currentSchedule), [currentSchedule]);
  const routeSegmentByActivityId = useMemo(
    () => new Map(routeQuality.segments.map((segment) => [segment.fromId, segment])),
    [routeQuality.segments]
  );
  const qualityStyle = ROUTE_LEVEL_STYLES[routeQuality.level];
  const routeDataLabel =
    routeQuality.totalSegments === 0
      ? '없음'
      : routeQuality.verifiedSegments > 0
        ? `${routeQuality.verifiedSegments}/${routeQuality.totalSegments} 검증`
        : routeQuality.estimatedSegments > 0
          ? `${routeQuality.estimatedSegments}/${routeQuality.totalSegments} 추정`
          : `${routeQuality.knownSegments}/${routeQuality.totalSegments}`;

  // 구글 맵 URL 생성 (검증된 placeId 우선, 비장소 활동 제외 — lib/utils/mapUrls.ts)
  const mapUrls = useMemo(
    () =>
      currentSchedule
        ? buildDayMapUrls({
            activities: currentSchedule.activities,
            destination: userInput.destination,
            focusedActivityId,
            apiKey: GOOGLE_API_KEY,
          })
        : { embed: '', external: '' },
    [currentSchedule, userInput.destination, focusedActivityId]
  );

  const handleActivitySelect = (activityId: string) => {
    setMapState((state) => {
      const currentFocusedId = state.selectedDay === selectedDay ? state.focusedActivityId : null;
      const currentExpandedId = state.selectedDay === selectedDay ? state.expandedActivityId : null;

      return {
        selectedDay,
        focusedActivityId: currentFocusedId === activityId ? null : activityId,
        expandedActivityId: currentExpandedId,
        isMapLoading: true,
      };
    });
  };

  const handleToggleExpand = (activityId: string) => {
    setMapState((state) => {
      const currentFocusedId = state.selectedDay === selectedDay ? state.focusedActivityId : null;
      const currentExpandedId = state.selectedDay === selectedDay ? state.expandedActivityId : null;

      return {
        selectedDay,
        focusedActivityId: currentFocusedId,
        expandedActivityId: currentExpandedId === activityId ? null : activityId,
        isMapLoading: state.selectedDay === selectedDay ? state.isMapLoading : true,
      };
    });
  };

  return (
    <div className="animate-fadeInUp">
      {/* 날짜 선택 */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {scheduleData.map((day) => (
          <button
            key={day.day}
            onClick={() => setSelectedDay(day.day)}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border-2 transition-all duration-200 ${
              selectedDay === day.day
                ? 'bg-black text-white border-black shadow-lg'
                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <span className="text-[10px] font-medium opacity-70">Day</span>
            <span className="text-lg font-bold">{day.day}</span>
          </button>
        ))}
      </div>

      {/* 메인 레이아웃: 지도 + 타임라인 */}
      <div className={`mb-4 rounded-2xl border p-4 ${qualityStyle.card}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              {routeQuality.level === 'busy' ? (
                <AlertTriangle className="h-5 w-5" />
              ) : routeQuality.level === 'unknown' ? (
                <Route className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                지도 기반 동선 품질
              </p>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900">{routeQuality.label}</h3>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold">
                  {routeQuality.score === null ? 'N/A' : `${routeQuality.score}점`}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{routeQuality.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-[260px]">
            <div className="rounded-lg bg-white/75 px-3 py-2">
              <p className="text-slate-400">총 이동</p>
              <p className="font-bold text-slate-900">
                {routeQuality.knownSegments > 0
                  ? formatTravelMinutes(routeQuality.totalTravelMinutes)
                  : '대기'}
              </p>
            </div>
            <div className="rounded-lg bg-white/75 px-3 py-2">
              <p className="text-slate-400">최장 구간</p>
              <p className="font-bold text-slate-900">
                {routeQuality.knownSegments > 0
                  ? formatTravelMinutes(routeQuality.longestSegmentMinutes)
                  : '대기'}
              </p>
            </div>
            <div className="rounded-lg bg-white/75 px-3 py-2">
              <p className="text-slate-400">이동 데이터</p>
              <p className="font-bold text-slate-900">{routeDataLabel}</p>
            </div>
            <div className="rounded-lg bg-white/75 px-3 py-2">
              <p className="text-slate-400">장소 검증</p>
              <p className="font-bold text-slate-900">
                {routeQuality.validatedPlaces}/{routeQuality.validateTargets}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
          <div
            className={`h-full rounded-full transition-all ${qualityStyle.bar}`}
            style={{ width: `${routeQuality.score ?? 0}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 왼쪽: 타임라인 */}
        <div className="order-2 lg:order-1">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                Day {selectedDay} 일정
                <span className="text-xs font-normal text-slate-400">
                  ({currentSchedule?.activities.length || 0}개)
                </span>
              </h3>
              {focusedActivityId && (
                <button
                  onClick={() =>
                    setMapState({
                      selectedDay,
                      focusedActivityId: null,
                      expandedActivityId,
                      isMapLoading: true,
                    })
                  }
                  className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1.5 rounded-full transition-colors"
                >
                  <RefreshCcw className="w-3 h-3" />
                  전체 경로
                </button>
              )}
            </div>

            {/* 타임라인 목록 */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide">
              {currentSchedule?.activities.map((activity, index) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  index={index}
                  isSelected={focusedActivityId === activity.id}
                  isExpanded={expandedActivityId === activity.id}
                  onSelect={() => handleActivitySelect(activity.id)}
                  onToggleExpand={() => handleToggleExpand(activity.id)}
                  isLast={index === currentSchedule.activities.length - 1}
                  travelSegment={routeSegmentByActivityId.get(activity.id)}
                />
              ))}

              {(!currentSchedule || currentSchedule.activities.length === 0) && (
                <div className="text-center py-8 text-slate-400">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">일정이 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 지도 */}
        <div className="order-1 lg:order-2">
          <div className="bg-slate-100 rounded-2xl h-[400px] lg:h-[500px] relative overflow-hidden border border-slate-200 shadow-inner">
            {/* 로딩 오버레이 */}
            {isMapLoading &&
              GOOGLE_API_KEY &&
              currentSchedule &&
              currentSchedule.activities.length > 0 && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                    <span className="text-sm text-slate-500">지도 로딩 중...</span>
                  </div>
                </div>
              )}

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
	                onLoad={() => {
	                  if (selectedDayRef.current !== selectedDay) return;
	                  setMapState((state) => ({
	                    selectedDay,
	                    focusedActivityId: state.selectedDay === selectedDay ? state.focusedActivityId : null,
	                    expandedActivityId:
	                      state.selectedDay === selectedDay ? state.expandedActivityId : null,
	                    isMapLoading: false,
	                  }));
	                }}
	                className="transition-opacity duration-300"
	              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-6">
                  <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium mb-1">
                    {!GOOGLE_API_KEY ? 'Google Maps API 키가 필요합니다' : '표시할 장소가 없습니다'}
                  </p>
                </div>
              </div>
            )}

            {/* 외부 링크 버튼 */}
            {mapUrls.external && (
              <a
                href={mapUrls.external}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-5 py-2.5 rounded-full font-medium shadow-lg hover:scale-105 hover:shadow-xl transition-all flex items-center gap-2 z-10 text-sm"
              >
                <Navigation className="w-4 h-4" />
                {focusedActivityId ? '장소 상세보기' : '전체 경로 열기'}
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
          </div>

          {/* 선택된 장소 정보 */}
          {focusedActivityId && currentSchedule && (
            <div className="mt-3 bg-gradient-to-r from-black to-slate-800 text-white rounded-xl p-4 animate-fadeIn">
              {(() => {
                const activity = currentSchedule.activities.find((a) => a.id === focusedActivityId);
                if (!activity) return null;
                const style = getActivityStyle(activity.type);
                const Icon = style.icon;

                return (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">{activity.title}</h4>
                      <p className="text-white/70 text-sm mt-0.5">{activity.desc}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
                        <span>🕐 {activity.time}</span>
                        <span>⏱ {activity.duration}</span>
                        {activity.price !== undefined && activity.price > 0 && (
                          <span>💰 ₩{activity.price.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
