'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Calendar,
  Plane,
  Building2,
  MapPin,
  Sparkles,
  Wallet,
  Clock3,
  Footprints,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import Header from '@/components/ui/Header';
import FlightSection from './FlightSection';
import HotelSection from './HotelSection';
import {
  BUDGET_PREFERENCE_OPTIONS,
  TRANSPORT_PREFERENCE_OPTIONS,
  TRAVEL_PACE_OPTIONS,
  TRAVEL_STYLE_OPTIONS,
} from '@/lib/utils/travelStyle';

interface SetupScreenProps {
  onBack: () => void;
  onNext: () => void;
  onNavigate: (screen: string) => void;
}

type Step = 'dates' | 'flight' | 'hotel' | 'style' | 'places';

const STEPS: Step[] = ['dates', 'flight', 'hotel', 'style', 'places'];

const STEP_INFO: Record<
  Step,
  { icon: React.ReactNode; label: string; title: string; subtitle: string }
> = {
  dates: {
    icon: <Calendar className="w-5 h-5" />,
    label: '날짜',
    title: '언제 떠나시나요?',
    subtitle: '여행의 시작과 끝을 알려주세요',
  },
  flight: {
    icon: <Plane className="w-5 h-5" />,
    label: '항공',
    title: '항공편 정보',
    subtitle: '예약하신 항공편이 있다면 입력해주세요',
  },
  hotel: {
    icon: <Building2 className="w-5 h-5" />,
    label: '숙소',
    title: '숙소 정보',
    subtitle: '머무실 숙소를 입력해주세요',
  },
  style: {
    icon: <Sparkles className="w-5 h-5" />,
    label: '스타일',
    title: '어떤 여행이 좋으세요?',
    subtitle: 'AI가 처음부터 이 컨셉에 맞춰 일정을 계획합니다',
  },
  places: {
    icon: <MapPin className="w-5 h-5" />,
    label: '장소',
    title: '꼭 가고 싶은 곳',
    subtitle: '이곳만큼은 꼭 가야한다! 하는 장소가 있나요?',
  },
};

const STYLE_ICON_MAP: Record<string, React.ElementType> = {
  budget: Wallet,
  relaxed: Clock3,
  packed: Sparkles,
  food: MapPin,
  culture: Building2,
  nature: Footprints,
  shopping: Plus,
};

// ============================================
// 날짜 유틸리티
// ============================================
const calculateDuration = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

const formatDateFull = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// ============================================
// 인라인 캘린더
// ============================================
interface CalendarProps {
  departureDate: string;
  returnDate: string;
  onDepartureDateChange: (date: string) => void;
  onReturnDateChange: (date: string) => void;
}

function InlineCalendar({
  departureDate,
  returnDate,
  onDepartureDateChange,
  onReturnDateChange,
}: CalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selecting, setSelecting] = useState<'departure' | 'return'>('departure');

  const months = [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ];
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
    const clickedDate = new Date(dateStr);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (clickedDate < todayStart) return;

    if (selecting === 'departure') {
      onDepartureDateChange(dateStr);
      if (returnDate && new Date(returnDate) < clickedDate) {
        onReturnDateChange('');
      }
      setSelecting('return');
    } else {
      if (departureDate && clickedDate < new Date(departureDate)) {
        onDepartureDateChange(dateStr);
        onReturnDateChange('');
      } else {
        onReturnDateChange(dateStr);
        setSelecting('departure');
      }
    }
  };

  const isDateInRange = (day: number) => {
    if (!departureDate || !returnDate) return false;
    const currentDate = new Date(currentYear, currentMonth, day);
    const start = new Date(departureDate);
    const end = new Date(returnDate);
    return currentDate > start && currentDate < end;
  };

  const isDateSelected = (day: number, type: 'departure' | 'return') => {
    const targetDate = type === 'departure' ? departureDate : returnDate;
    if (!targetDate) return false;
    const [year, month, d] = targetDate.split('-').map(Number);
    return year === currentYear && month === currentMonth + 1 && d === day;
  };

  const isPastDate = (day: number) => {
    const currentDate = new Date(currentYear, currentMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return currentDate < todayStart;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);
  const duration = calculateDuration(departureDate, returnDate);

  return (
    <div className="space-y-8 animate-fadeInUp">
      {/* 날짜 선택 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setSelecting('departure')}
          className={`relative p-6 rounded-3xl border text-left transition-all duration-300 overflow-hidden group ${
            selecting === 'departure'
              ? 'border-black bg-black text-white shadow-xl shadow-black/20 scale-[1.02]'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
          }`}
        >
          <div className="relative z-10">
            <p
              className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                selecting === 'departure' ? 'text-white/60' : 'text-slate-400'
              }`}
            >
              Departure
            </p>
            <p
              className={`text-xl font-bold ${
                !departureDate && selecting !== 'departure' ? 'text-slate-300' : ''
              }`}
            >
              {departureDate ? formatDateFull(departureDate) : '날짜 선택'}
            </p>
          </div>
          {selecting === 'departure' && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full pointer-events-none" />
          )}
        </button>

        <button
          onClick={() => setSelecting('return')}
          className={`relative p-6 rounded-3xl border text-left transition-all duration-300 overflow-hidden group ${
            selecting === 'return'
              ? 'border-black bg-black text-white shadow-xl shadow-black/20 scale-[1.02]'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
          }`}
        >
          <div className="relative z-10">
            <p
              className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                selecting === 'return' ? 'text-white/60' : 'text-slate-400'
              }`}
            >
              Return
            </p>
            <p
              className={`text-xl font-bold ${
                !returnDate && selecting !== 'return' ? 'text-slate-300' : ''
              }`}
            >
              {returnDate ? formatDateFull(returnDate) : '날짜 선택'}
            </p>
          </div>
          {selecting === 'return' && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full pointer-events-none" />
          )}
        </button>
      </div>

      {/* 기간 배지 */}
      {departureDate && returnDate && duration > 0 && (
        <div className="flex justify-center animate-fadeIn">
          <div className="inline-flex items-center gap-3 py-3 px-6 bg-slate-900 rounded-full shadow-lg shadow-black/10">
            <span className="text-xl">✈️</span>
            <span className="text-white font-bold text-lg">
              {duration - 1}박 {duration}일
            </span>
          </div>
        </div>
      )}

      {/* 캘린더 본체 */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={goToPrevMonth}
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-slate-900" />
          </button>
          <h3 className="text-xl font-bold text-slate-900">
            {currentYear}년 {months[currentMonth]}
          </h3>
          <button
            onClick={goToNextMonth}
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-slate-900" />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-4">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs font-bold uppercase tracking-widest py-2 ${
                i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        <div key={`${currentYear}-${currentMonth}`} className="grid grid-cols-7 gap-y-2">
          {emptyDays.map((i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const isDeparture = isDateSelected(day, 'departure');
            const isReturn = isDateSelected(day, 'return');
            const inRange = isDateInRange(day);
            const isPast = isPastDate(day);
            const dayOfWeek = (firstDay + day - 1) % 7;

            // 스타일링 로직
            let bgClass = 'hover:bg-slate-100';
            let textClass = 'text-slate-700';

            if (isPast) {
              textClass = 'text-slate-300 cursor-not-allowed';
              bgClass = '';
            } else if (isDeparture) {
              bgClass = 'bg-black text-white shadow-lg shadow-black/30 scale-110 z-10';
              textClass = 'text-white';
            } else if (isReturn) {
              bgClass = 'bg-black text-white shadow-lg shadow-black/30 scale-110 z-10';
              textClass = 'text-white';
            } else if (inRange) {
              bgClass = 'bg-slate-100';
              textClass = 'text-slate-900 font-bold';
            } else {
              if (dayOfWeek === 0) textClass = 'text-rose-500';
              else if (dayOfWeek === 6) textClass = 'text-blue-500';
            }

            return (
              <div
                key={day}
                className="relative aspect-square flex items-center justify-center p-0.5"
              >
                {/* 범위 배경 연결 효과 */}
                {inRange && (
                  <div
                    className={`absolute inset-y-2 inset-x-0 bg-slate-100 -z-10 ${
                      dayOfWeek === 0 || day === 1 ? 'rounded-l-full' : ''
                    } ${dayOfWeek === 6 || day === daysInMonth ? 'rounded-r-full' : ''}`}
                  />
                )}

                <button
                  onClick={() => !isPast && handleDateClick(day)}
                  disabled={isPast}
                  className={`w-10 h-10 flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                    isDeparture || isReturn ? 'rounded-full' : 'rounded-full'
                  } ${bgClass} ${textClass}`}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function SetupScreen({ onBack, onNext, onNavigate }: SetupScreenProps) {
  const { userInput, setFlightInput, setUserInput, generateTrip } = useTripStore();

  const [currentStep, setCurrentStep] = useState<Step>('dates');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'enter' | 'exit'>('enter');

  // 상태들
  const [departureDate, setDepartureDate] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>('');
  const [isFlightUndecided, setIsFlightUndecided] = useState(false);
  const [isHotelUndecided, setIsHotelUndecided] = useState(false);
  const [mustVisitPlaces, setMustVisitPlaces] = useState<string[]>(['']);

  const duration = calculateDuration(departureDate, returnDate);
  const currentStepIndex = STEPS.indexOf(currentStep);
  const stepInfo = STEP_INFO[currentStep];
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // 애니메이션
  const transitionToStep = (nextStep: Step) => {
    setAnimationDirection('exit');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setAnimationDirection('enter');
      setTimeout(() => setIsAnimating(false), 300);
    }, 200);
  };

  const goNext = () => {
    if (isAnimating) return;

    if (currentStep === 'dates') {
      if (!departureDate || !returnDate) {
        alert('출발일과 도착일을 모두 선택해주세요.');
        return;
      }
      if (duration < 1) {
        alert('도착일은 출발일 이후여야 합니다.');
        return;
      }
      setUserInput({ duration });
      setFlightInput({ departureDate, returnDate });
    }

    if (currentStep === 'flight') {
      if (isFlightUndecided) {
        setFlightInput({
          originAirportCode: '',
          destAirportCode: '',
          price: 0,
          departureTime: '',
          returnTime: '',
        });
      }
    }

    if (currentStep === 'hotel') {
      if (isHotelUndecided) {
        setUserInput({ ...userInput, hotels: [] });
      }
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      transitionToStep(STEPS[nextIndex]);
    } else {
      handleSubmit();
    }
  };

  const goPrev = () => {
    if (isAnimating) return;
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      transitionToStep(STEPS[prevIndex]);
    } else {
      onBack();
    }
  };

  const handleSubmit = () => {
    const filteredPlaces = mustVisitPlaces.filter((place) => place.trim() !== '');
    setUserInput({ mustVisitPlaces: filteredPlaces });
    onNext();
    generateTrip();
  };

  const addPlace = () => setMustVisitPlaces([...mustVisitPlaces, '']);
  const removePlace = (index: number) =>
    setMustVisitPlaces(mustVisitPlaces.filter((_, i) => i !== index));
  const updatePlace = (index: number, value: string) => {
    const updated = [...mustVisitPlaces];
    updated[index] = value;
    setMustVisitPlaces(updated);
  };
  const toggleTravelKeyword = (keyword: string) => {
    const currentKeywords = userInput.travelKeywords || [];
    const isSelected = currentKeywords.includes(keyword);
    const nextKeywords = isSelected
      ? currentKeywords.filter((item) => item !== keyword)
      : [...currentKeywords, keyword].slice(0, 3);

    setUserInput({ travelKeywords: nextKeywords });
  };

  const contentAnimationClass = isAnimating
    ? animationDirection === 'exit'
      ? 'opacity-0 translate-y-8 blur-sm'
      : 'opacity-0 -translate-y-8 blur-sm'
    : 'opacity-100 translate-y-0 blur-0';

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-body text-slate-900 selection:bg-black selection:text-white">
      <Header showBack onBack={goPrev} onNavigate={onNavigate} />

      <main className="max-w-2xl mx-auto px-6 py-12 pb-32">
        <div className={`transition-all duration-500 ease-out ${contentAnimationClass}`}>
          {/* 타이틀 섹션 */}
          <div className="mb-12 text-center space-y-3">
            <span className="inline-block py-1 px-3 rounded-full bg-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Step {currentStepIndex + 1}
            </span>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {stepInfo.title}
            </h1>
            <p className="text-lg text-slate-500 font-medium">{stepInfo.subtitle}</p>
          </div>

          {/* 컨텐츠 */}
          <div className="relative">
            {currentStep === 'dates' && (
              <InlineCalendar
                departureDate={departureDate}
                returnDate={returnDate}
                onDepartureDateChange={setDepartureDate}
                onReturnDateChange={setReturnDate}
              />
            )}

            {currentStep === 'flight' && (
              <FlightSection
                isUndecided={isFlightUndecided}
                onUndecidedChange={setIsFlightUndecided}
                departureDate={departureDate}
                returnDate={returnDate}
              />
            )}

            {currentStep === 'hotel' && (
              <HotelSection
                isUndecided={isHotelUndecided}
                onUndecidedChange={setIsHotelUndecided}
              />
            )}

            {currentStep === 'style' && (
              <div className="space-y-8 animate-fadeInUp">
                <section>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">대표 컨셉</h2>
                      <p className="text-sm text-slate-500">가장 중요한 여행 방향 하나를 골라주세요.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      1개 선택
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TRAVEL_STYLE_OPTIONS.map((option) => {
                      const Icon = STYLE_ICON_MAP[option.id] || Sparkles;
                      const isSelected = userInput.travelStyle === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setUserInput({
                              travelStyle: option.id,
                              travelKeywords: (userInput.travelKeywords || []).filter(
                                (keyword) => keyword !== option.id
                              ),
                            })
                          }
                          className={`flex min-h-[104px] items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                            isSelected
                              ? 'border-black bg-black text-white shadow-xl shadow-black/15'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                              isSelected ? 'bg-white text-black' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold">{option.label}</h3>
                            <p
                              className={`mt-1 text-sm leading-relaxed ${
                                isSelected ? 'text-white/70' : 'text-slate-500'
                              }`}
                            >
                              {option.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">보조 키워드</h2>
                      <p className="text-sm text-slate-500">추가로 반영할 취향을 최대 3개까지 선택하세요.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      {(userInput.travelKeywords || []).length}/3
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {TRAVEL_STYLE_OPTIONS.filter((option) => option.id !== userInput.travelStyle).map(
                      (option) => {
                        const isSelected = (userInput.travelKeywords || []).includes(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleTravelKeyword(option.id)}
                            className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                              isSelected
                                ? 'border-black bg-black text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      }
                    )}
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                      일정 밀도
                    </h2>
                    <div className="space-y-2">
                      {TRAVEL_PACE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setUserInput({ pace: option.id })}
                          className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-bold transition-all ${
                            (userInput.pace || 'balanced') === option.id
                              ? 'border-black bg-black text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                      비용 성향
                    </h2>
                    <div className="space-y-2">
                      {BUDGET_PREFERENCE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setUserInput({ budgetPreference: option.id })}
                          className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-bold transition-all ${
                            (userInput.budgetPreference || 'balanced') === option.id
                              ? 'border-black bg-black text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                      이동 방식
                    </h2>
                    <div className="space-y-2">
                      {TRANSPORT_PREFERENCE_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setUserInput({ transportPreference: option.id })}
                          className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-bold transition-all ${
                            (userInput.transportPreference || 'flexible') === option.id
                              ? 'border-black bg-black text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {currentStep === 'places' && (
              <div className="space-y-4 animate-fadeInUp">
                {mustVisitPlaces.map((place, index) => (
                  <div key={index} className="group flex items-center gap-3">
                    <div className="flex-1 relative transition-transform duration-300 focus-within:scale-[1.02]">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-lg">
                        📍
                      </div>
                      <input
                        type="text"
                        value={place}
                        onChange={(e) => updatePlace(index, e.target.value)}
                        placeholder="장소 이름 (예: 에펠탑, 센소지)"
                        className="w-full h-16 pl-16 pr-6 bg-white border border-slate-200 rounded-2xl text-lg font-bold placeholder:font-normal placeholder:text-slate-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all shadow-sm"
                        autoFocus={index === mustVisitPlaces.length - 1 && index > 0}
                      />
                    </div>
                    {mustVisitPlaces.length > 1 && (
                      <button
                        onClick={() => removePlace(index)}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addPlace}
                  className="w-full h-16 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-bold hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all group"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-white flex items-center justify-center group-hover:bg-slate-400 transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  장소 추가하기
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 하단 고정 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FDFDFD] via-[#FDFDFD]/95 to-transparent z-40 pointer-events-none">
        <div className="max-w-2xl mx-auto flex items-center justify-between pointer-events-auto">
          {currentStepIndex > 0 ? (
            <button
              onClick={goPrev}
              disabled={isAnimating}
              className="flex items-center gap-2 px-6 py-4 text-slate-500 font-bold hover:text-black transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              이전
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={goNext}
            disabled={
              isAnimating ||
              (currentStep === 'dates' && (!departureDate || !returnDate || duration < 1))
            }
            className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-black/20 transition-all duration-300 active:scale-95 hover:shadow-2xl hover:-translate-y-1 ${
              isAnimating ||
              (currentStep === 'dates' && (!departureDate || !returnDate || duration < 1))
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                : 'bg-black text-white'
            }`}
          >
            <span>{isLastStep ? '일정 생성 시작' : '다음 단계'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
