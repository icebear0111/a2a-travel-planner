'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Download,
  Copy,
  Check,
  Link,
  Calendar,
  ArrowUpRight,
  Plane,
  Wallet,
  Loader2,
  FileDown,
} from 'lucide-react';
import { useTripStore } from '@/stores/tripStore';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/ui/Header';
import { formatKoreanCurrency } from '@/lib/utils/format';

interface ShareScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateCompact = (date: Date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate()
  ).padStart(2, '0')}`;

const formatCalendarDateTime = (date: Date, time: string) => {
  const [hours = '09', minutes = '00'] = time.split(':');
  return `${formatDateCompact(date)}T${hours.padStart(2, '0')}${minutes.padStart(2, '0')}00`;
};

const parseDurationMinutes = (duration: string) => {
  const hourMatch = duration.match(/(\d+)\s*(시간|h)/i);
  const minuteMatch = duration.match(/(\d+)\s*(분|m)/i);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  return Math.max(30, hours * 60 + minutes || 60);
};

const formatIcsText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

export default function ShareScreen({ onBack, onNavigate }: ShareScreenProps) {
  const {
    tripData,
    userInput,
    scheduleData,
    budgetData,
    shareTripAndGetUrl,
    isSharing,
    currentShareId,
  } =
    useTripStore();
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // 공유 URL 생성
  useEffect(() => {
    const generateShareUrl = async () => {
      // 이미 공유된 경우 기존 URL 사용
      if (currentShareId) {
        setShareUrl(`${window.location.origin}?view=shared&id=${currentShareId}`);
        return;
      }

      // 로그인하지 않은 경우 임시 URL 표시
      if (!user) {
        setShareUrl(null);
        return;
      }

      // 공유 URL 생성
      const userName = user.displayName || user.email?.split('@')[0] || '익명';
      const shareId = await shareTripAndGetUrl(userName);
      if (shareId) {
        setShareUrl(`${window.location.origin}?view=shared&id=${shareId}`);
      }
    };

    generateShareUrl();
  }, [user, currentShareId, shareTripAndGetUrl]);

  const startDate = parseDate(userInput.flight.departureDate);
  const returnDate = parseDate(userInput.flight.returnDate);
  const tripTitle = tripData.title || userInput.destination || '여행 일정';
  const tripDateText =
    tripData.dates || `${userInput.flight.departureDate} ~ ${userInput.flight.returnDate}`;

  const handleCopy = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePdfDownload = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');

    if (!printWindow) {
      alert('PDF 생성을 위해 팝업 허용이 필요합니다.');
      return;
    }

    const itineraryHtml = scheduleData
      .map(
        (day) => `
          <section class="day">
            <h2>Day ${day.day}</h2>
            <p class="theme">${escapeHtml(day.theme || '')}</p>
            ${day.activities
              .map(
                (activity) => `
                  <div class="activity">
                    <div class="time">${escapeHtml(activity.time)}</div>
                    <div>
                      <h3>${escapeHtml(activity.title)}</h3>
                      <p>${escapeHtml(activity.desc || '')}</p>
                      <span>${escapeHtml(activity.type)} · ${escapeHtml(
                        activity.duration || '-'
                      )} · ${formatKoreanCurrency(activity.price || 0) || '무료'}</span>
                    </div>
                  </div>
                `
              )
              .join('')}
          </section>
        `
      )
      .join('');

    printWindow.document.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(tripTitle)} itinerary</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; margin: 40px; }
            .cover { border-bottom: 2px solid #0f172a; padding-bottom: 24px; margin-bottom: 28px; }
            h1 { font-size: 36px; margin: 0 0 8px; }
            h2 { font-size: 22px; margin: 28px 0 4px; }
            h3 { font-size: 16px; margin: 0 0 4px; }
            p { margin: 0; color: #475569; }
            .meta { display: flex; gap: 16px; margin-top: 16px; color: #334155; font-weight: 700; }
            .day { break-inside: avoid; margin-bottom: 18px; }
            .theme { margin-bottom: 12px; }
            .activity { display: grid; grid-template-columns: 72px 1fr; gap: 16px; padding: 12px 0; border-top: 1px solid #e2e8f0; }
            .time { font-weight: 800; }
            .activity span { color: #64748b; font-size: 12px; font-weight: 700; }
            @media print { body { margin: 24px; } }
          </style>
        </head>
        <body>
          <div class="cover">
            <h1>${escapeHtml(tripTitle)}</h1>
            <p>${escapeHtml(tripData.subtitle || 'AI 추천 여행 일정')}</p>
            <div class="meta">
              <span>${escapeHtml(tripDateText || '날짜 미정')}</span>
              <span>${tripData.days || scheduleData.length}일</span>
              <span>${formatKoreanCurrency(budgetData.total) || '예산 미정'}</span>
            </div>
          </div>
          ${itineraryHtml}
          <script>
            window.addEventListener('load', () => {
              window.print();
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleGoogleCalendar = () => {
    if (!startDate) {
      alert('Google Calendar에 추가하려면 여행 출발일이 필요합니다.');
      return;
    }

    const endDate = returnDate ? addDays(returnDate, 1) : addDays(startDate, tripData.days || 1);
    const details = scheduleData
      .map(
        (day) =>
          `Day ${day.day}\\n${day.activities
            .map((activity) => `${activity.time} ${activity.title} - ${activity.desc}`)
            .join('\\n')}`
      )
      .join('\\n\\n');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${tripTitle} 여행 일정`,
      dates: `${formatDateCompact(startDate)}/${formatDateCompact(endDate)}`,
      details,
      location: userInput.destination || tripTitle,
    });

    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank', 'noopener,noreferrer');
  };

  const handleIcsDownload = () => {
    if (!startDate) {
      alert('캘린더 파일을 만들려면 여행 출발일이 필요합니다.');
      return;
    }

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const events = scheduleData.flatMap((day) => {
      const eventDate = addDays(startDate, day.day - 1);

      return day.activities.map((activity) => {
        const durationMinutes = parseDurationMinutes(activity.duration);
        const start = formatCalendarDateTime(eventDate, activity.time || '09:00');
        const endDateTime = new Date(eventDate);
        const [hours = '09', minutes = '00'] = (activity.time || '09:00').split(':');
        endDateTime.setHours(Number(hours), Number(minutes) + durationMinutes, 0, 0);

        return [
          'BEGIN:VEVENT',
          `UID:${activity.id}@a2a-travel-planner`,
          `DTSTAMP:${now}`,
          `DTSTART:${start}`,
          `DTEND:${formatCalendarDateTime(endDateTime, `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`)}`,
          `SUMMARY:${formatIcsText(activity.title)}`,
          `DESCRIPTION:${formatIcsText(activity.desc || tripTitle)}`,
          `LOCATION:${formatIcsText(activity.address || activity.location || userInput.destination || '')}`,
          'END:VEVENT',
        ].join('\r\n');
      });
    });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//A2A Travel Planner//KO', ...events, 'END:VCALENDAR'].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${tripTitle.replace(/\s+/g, '-') || 'travel-itinerary'}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white font-body text-slate-900 pb-20">
      <Header showBack onBack={onBack} subtitle="여행 공유" onNavigate={onNavigate} />

      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* 미리보기 카드 */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
          {/* 이미지 영역 */}
          <div className="relative h-44 w-full">
            <Image
              src={tripData.image || '/placeholder.jpg'}
              alt={tripData.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <p className="text-xs font-bold bg-white/20 backdrop-blur-md px-2 py-1 rounded inline-block mb-2">
                ✈️ ITINERARY
              </p>
              <h2 className="font-bold text-xl leading-tight">
                {tripData.title || userInput.destination}
              </h2>
              {tripData.subtitle && (
                <p className="text-white/80 text-sm mt-1">{tripData.subtitle}</p>
              )}
            </div>
          </div>

          {/* 티켓 정보 영역 */}
          <div className="p-5 relative">
            {/* 펀치 구멍 효과 */}
            <div className="absolute -left-3 top-0 w-6 h-6 bg-slate-50 rounded-full" />
            <div className="absolute -right-3 top-0 w-6 h-6 bg-slate-50 rounded-full" />
            <div className="absolute top-3 left-4 right-4 border-t-2 border-dashed border-slate-200" />

            <div className="mt-4 space-y-3">
              {/* 날짜 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium">일정</span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {tripData.dates ||
                    `${userInput.flight.departureDate} ~ ${userInput.flight.returnDate}`}
                </span>
              </div>

              {/* 기간 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500">
                  <Plane className="w-4 h-4" />
                  <span className="text-xs font-medium">기간</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{tripData.days}일</span>
              </div>

              {/* 예상 비용 */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-slate-500">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-medium">예상 비용</span>
                </div>
                <span className="text-sm font-bold text-slate-900">
                  {formatKoreanCurrency(budgetData.total)}
                </span>
              </div>
            </div>

            {/* PDF 다운로드 버튼 */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <button
                onClick={handlePdfDownload}
                className="w-full py-3.5 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-black/20"
              >
                <Download className="w-5 h-5" />
                PDF 다운로드
              </button>
            </div>
          </div>
        </div>

        {/* 링크 공유 */}
        <div>
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Link className="w-4 h-4" /> 링크 공유
          </h3>

          {!user ? (
            // 비로그인 상태
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-center">
              <p className="text-sm text-slate-500 mb-2">링크 공유를 위해 로그인이 필요합니다</p>
            </div>
          ) : isSharing ? (
            // 공유 URL 생성 중
            <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              <span className="text-sm text-slate-500">공유 링크 생성 중...</span>
            </div>
          ) : shareUrl ? (
            // 공유 URL 생성 완료
            <>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 truncate font-medium">
                  {shareUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className={`px-4 py-3 rounded-xl transition-all font-bold border ${
                    copied
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-600 mt-2 font-medium">
                  ✓ 클립보드에 복사되었습니다
                </p>
              )}
            </>
          ) : (
            // URL 생성 실패
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 text-center">
              <p className="text-sm text-slate-500">공유 링크 생성에 실패했습니다</p>
            </div>
          )}
        </div>

        {/* 캘린더 연동 */}
        <button
          onClick={handleGoogleCalendar}
          className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-400 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <Calendar className="w-5 h-5 text-blue-600 group-hover:text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900">Google Calendar 추가</p>
              <p className="text-xs text-slate-400">일정을 캘린더에 저장</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-black" />
        </button>

        <button
          onClick={handleIcsDownload}
          className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-400 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
              <FileDown className="w-5 h-5 text-emerald-600 group-hover:text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900">캘린더 파일 다운로드</p>
              <p className="text-xs text-slate-400">Apple/Outlook 캘린더용 .ics</p>
            </div>
          </div>
          <Download className="w-5 h-5 text-slate-300 group-hover:text-black" />
        </button>
      </div>
    </div>
  );
}
