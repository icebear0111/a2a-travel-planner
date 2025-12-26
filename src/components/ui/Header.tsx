// components/ui/Header.tsx
'use client';

import React from 'react';
import { Menu, Compass, ChevronLeft } from 'lucide-react';

interface HeaderProps {
  isMobile?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  subtitle?: string;
}

export default function Header({
  isMobile = false,
  showBack = false,
  onBack,
  subtitle,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* 좌측: 로고 또는 뒤로가기 */}
        <div className="flex items-center gap-4">
          {showBack && onBack ? (
            <>
              <button
                onClick={onBack}
                className="group p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-slate-400 group-hover:text-black transition-colors" />
              </button>
              {subtitle && (
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  {subtitle}
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">A2A.</span>
            </div>
          )}
        </div>

        {/* 우측: 네비게이션 */}
        {!showBack &&
          (isMobile ? (
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <nav className="flex gap-6 text-sm font-medium text-slate-500">
              <button className="hover:text-black transition-colors">Trips</button>
              <button className="hover:text-black transition-colors">Saved</button>
              <button className="text-black bg-slate-100 px-4 py-2 rounded-full hover:bg-slate-200 transition-colors">
                Log in
              </button>
            </nav>
          ))}
      </div>
    </header>
  );
}

