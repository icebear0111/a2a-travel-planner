'use client';

import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import '@/styles/datepicker.css';

interface CustomTimePickerProps {
  selectedTime: string | undefined;
  onChange: (time: string) => void;
  placeholder?: string;
}

export default function CustomTimePicker({
  selectedTime,
  onChange,
  placeholder = '시간 선택',
}: CustomTimePickerProps) {
  // "14:30" 문자열 -> Date 객체로 변환 (오늘 날짜 기준)
  const timeValue = selectedTime
    ? new Date(`2000-01-01T${selectedTime}`)
    : null;

  // Date 객체 -> "HH:MM" 문자열로 변환하여 부모에게 전달
  const handleTimeChange = (date: Date | null) => {
    if (date) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      onChange(`${hours}:${minutes}`);
    } else {
      onChange('');
    }
  };

  return (
    <div className="relative w-full">
      {/* 아이콘 */}
      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />

      <DatePicker
        locale={ko}
        selected={timeValue}
        onChange={handleTimeChange}
        showTimeSelect
        showTimeSelectOnly
        timeIntervals={5}
        timeCaption="시간"
        dateFormat="HH:mm"
        placeholderText={placeholder}
        wrapperClassName="w-full"
        className="w-full bg-slate-50 pl-10 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black/10 transition-all outline-none cursor-pointer placeholder:text-slate-400"
        popperPlacement="bottom-start"
      />
    </div>
  );
}

