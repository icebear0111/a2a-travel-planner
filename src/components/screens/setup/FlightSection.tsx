'use client';

import React from 'react';
import { Plane, Banknote, Check, ChevronDown, Car, TrainFront, Bus } from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { ORIGIN_AIRPORTS, ARRIVAL_AIRPORTS } from '@/constants/airports';
import {
  DomesticTravelMode,
  getDefaultTravelMode,
  getDomesticDestination,
} from '@/constants/destinations';
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

const MODE_META: Record<
  DomesticTravelMode,
  { label: string; Icon: React.ElementType; timeLabel: [string, string] }
> = {
  flight: { label: '항공', Icon: Plane, timeLabel: ['출발 항공편', '귀가 항공편'] },
  train: { label: '기차 (KTX)', Icon: TrainFront, timeLabel: ['출발 열차', '귀경 열차'] },
  bus: { label: '버스', Icon: Bus, timeLabel: ['출발 버스', '귀가 버스'] },
  car: { label: '자차·렌터카', Icon: Car, timeLabel: ['출발 시간', '귀가 출발'] },
};

export default function FlightSection({
  isUndecided,
  onUndecidedChange,
  departureDate,
  returnDate,
}: FlightSectionProps) {
  const { userInput, setUserInput, setFlightInput } = useTripStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
      setFlightInput({ [name]: Number(value) });
    } else {
      setFlightInput({ [name]: value });
    }
  };

  // ============================================
  // 국내여행: 이동수단 선택 (항공/기차/자차)
  // ============================================
  // 사용자가 확인한 국내/해외 값 우선, 미확인이면 여행지 테이블로 자동 추정
  const domestic = getDomesticDestination(userInput.destination);
  const isDomestic = userInput.isDomestic ?? Boolean(domestic);

  if (isDomestic) {
    // 모든 국내 여행지에서 4개 수단을 동일하게 제공한다 (통일성).
    // 테이블에 데이터가 있으면 즉시 표시하고, 없는 수단은 AI가
    // 소요시간·비용·출발지(가까운 공항·역·터미널)를 추정한다.
    const info = domestic?.info;
    const destinationName = domestic?.name || userInput.destination.trim();
    const availableModes: DomesticTravelMode[] = ['flight', 'train', 'bus', 'car'];
    const selectedMode =
      userInput.travelMode && availableModes.includes(userInput.travelMode)
        ? userInput.travelMode
        : info
          ? getDefaultTravelMode(info)
          : 'car';
    const meta = MODE_META[selectedMode];

    const routeSummary =
      selectedMode === 'flight'
        ? info?.flight
          ? {
              from: info.flight.originCode,
              to: info.flight.destCode,
              via: info.flight.airline,
              duration: info.flight.duration as string | undefined,
              price: info.flight.price as number | undefined,
            }
          : {
              from: 'GMP',
              to: `${destinationName} 인근 공항`,
              via: '국내선',
              duration: undefined,
              price: undefined,
            }
        : selectedMode === 'train'
          ? {
              from: info?.train?.originStation || '서울',
              to: info?.train?.destStation || destinationName,
              via: info?.train?.trainName || '기차 (KTX)',
              duration: info?.train?.duration,
              price: info?.train?.price,
            }
          : selectedMode === 'bus'
            ? {
                from: info?.bus?.originTerminal || '서울고속버스터미널',
                to: info?.bus?.destTerminal || `${destinationName} 터미널`,
                via: '고속버스',
                duration: info?.bus?.duration,
                price: info?.bus?.price,
              }
            : {
                from: '서울',
                to: destinationName,
                via: '자차·렌터카',
                duration: info?.drive?.duration,
                price: info?.drive?.cost,
              };

    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">이동 수단</h2>
          <p className="text-sm text-slate-400 mt-1">
            {destinationName}까지 어떻게 이동하시나요?
          </p>
        </div>

        {/* 이동수단 선택 */}
        <div
          className={`grid gap-3 mb-6 ${
            availableModes.length === 1
              ? 'grid-cols-1'
              : availableModes.length === 2
                ? 'grid-cols-2'
                : availableModes.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-4'
          }`}
        >
          {availableModes.map((mode) => {
            const { label, Icon } = MODE_META[mode];
            const isSelected = mode === selectedMode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setUserInput({ travelMode: mode })}
                className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 transition-all ${
                  isSelected
                    ? 'border-black bg-black text-white shadow-lg'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-bold">{label}</span>
              </button>
            );
          })}
        </div>

        {/* 노선 요약 */}
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
                <meta.Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-lg text-slate-900">
                  {routeSummary.from} → {routeSummary.to}
                </p>
                <p className="text-sm text-slate-500">
                  {routeSummary.via} ·{' '}
                  {routeSummary.duration ? `약 ${routeSummary.duration}` : '소요시간 AI 추정'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase">왕복 예상</p>
              <p className="font-bold text-slate-900">
                {userInput.flight.price || routeSummary.price
                  ? formatKoreanCurrency(userInput.flight.price || routeSummary.price || 0)
                  : 'AI 추정'}
              </p>
            </div>
          </div>
        </div>

        {/* 시간 카드 */}
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 mb-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                  {meta.timeLabel[0]}
                </p>
                <p className="font-bold text-lg text-slate-900">{formatDateWithDay(departureDate)}</p>
              </div>
              <div className="w-32">
                <CustomTimePicker
                  selectedTime={userInput.flight.departureTime}
                  onChange={(time) => setFlightInput({ departureTime: time })}
                  placeholder="09:00"
                />
              </div>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                  {meta.timeLabel[1]}
                </p>
                <p className="font-bold text-lg text-slate-900">{formatDateWithDay(returnDate)}</p>
              </div>
              <div className="w-32">
                <CustomTimePicker
                  selectedTime={userInput.flight.returnTime}
                  onChange={(time) => setFlightInput({ returnTime: time })}
                  placeholder="18:00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 비용 (선택) */}
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider">
            {selectedMode === 'car' ? '왕복 유류·통행료 (선택)' : '왕복 교통비 (선택)'}
          </label>
          <div className="relative group">
            <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-black transition-colors" />
            <input
              type="number"
              name="price"
              placeholder={
                routeSummary.price
                  ? `미입력 시 약 ${formatKoreanCurrency(routeSummary.price)}로 추정`
                  : '미입력 시 AI가 자동 추정해요'
              }
              value={userInput.flight.price || ''}
              onChange={handleChange}
              className="w-full h-14 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-medium hover:border-slate-300"
            />
          </div>
        </div>
      </div>
    );
  }

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
