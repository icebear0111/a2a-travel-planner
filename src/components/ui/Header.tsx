// components/ui/Header.tsx
'use client';

import React from 'react';
import { Menu, Compass, ChevronLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

type HeaderVariant = 'default' | 'login' | 'signup' | 'minimal';

interface HeaderProps {
  isMobile?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  subtitle?: string;
  onNavigate?: (screen: string) => void;
  variant?: HeaderVariant;
}

export default function Header({
  isMobile = false,
  showBack = false,
  onBack,
  subtitle,
  onNavigate,
  variant = 'default',
}: HeaderProps) {
  const { user, signOut } = useAuthStore();

  // 로고 클릭 시 홈으로 이동
  const handleLogoClick = () => {
    if (variant === 'login' || variant === 'signup') {
      onNavigate?.('home');
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  const isAuthPage = variant === 'login' || variant === 'signup';

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
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2"
              disabled={!isAuthPage}
            >
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">A2A.</span>
            </button>
          )}
        </div>

        {/* 우측: 네비게이션 (variant에 따라 다르게 표시) */}
        {!showBack &&
          variant === 'default' &&
          (isMobile ? (
            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          ) : (
            <nav className="flex gap-6 text-sm font-medium text-slate-500 items-center">
              <button className="hover:text-black transition-colors">Trips</button>
              <button className="hover:text-black transition-colors">Saved</button>

              {user ? (
                // 로그인 상태: 이름 + 로그아웃
                <div className="flex items-center gap-3">
                  <span className="text-black max-w-32 truncate">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title="로그아웃"
                  >
                    <LogOut className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              ) : (
                // 비로그인 상태: 로그인 버튼
                <button
                  onClick={() => onNavigate?.('login')}
                  className="text-black bg-slate-100 px-4 py-1.5 rounded-full hover:bg-slate-200 transition-colors"
                >
                  Log in
                </button>
              )}
            </nav>
          ))}

        {/* login/signup variant: 로고만 표시 (우측 버튼 없음) */}
      </div>
    </header>
  );
}
