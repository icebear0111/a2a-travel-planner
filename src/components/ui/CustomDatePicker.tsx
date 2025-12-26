'use client';

import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import '@/styles/datepicker.css';

interface CustomDatePickerProps {
  selectedDate: string | undefined;
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: Date;
}

export default function CustomDatePicker({
  selectedDate,
  onChange,
  placeholder = '날짜 선택',
  minDate,
}: CustomDatePickerProps) {
  // 문자열("2025-01-01") -> Date 객체 변환
  const dateValue = selectedDate ? new Date(selectedDate) : null;

  // Date 객체 -> 문자열 변환 및 부모에게 전달
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // 로컬 시간대 기준 YYYY-MM-DD 포맷팅
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange('');
    }
  };

  return (
    <div className="relative w-full">
      {/* 아이콘 */}
      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />

      <DatePicker
        locale={ko}
        selected={dateValue}
        onChange={handleDateChange}
        dateFormat="yyyy-MM-dd"
        placeholderText={placeholder}
        minDate={minDate}
        wrapperClassName="w-full"
        className="w-full bg-slate-50 pl-10 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-black/5 focus:border-black/10 transition-all outline-none cursor-pointer"
        popperPlacement="bottom-start"
      />
    </div>
  );
}

