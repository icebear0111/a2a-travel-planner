// components/ui/Header.tsx
'use client';

import React from 'react';
import { Menu, Compass, ChevronLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

type HeaderVariant = 'default' | 'login' | 'signup' | 'minimal' | 'transparent';

interface HeaderProps {
  isMobile?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  subtitle?: string;
  onNavigate?: (screen: string) => void;
  variant?: HeaderVariant;
  rightContent?: React.ReactNode;
}

export default function Header({
  isMobile = false,
  showBack = false,
  onBack,
  subtitle,
  onNavigate,
  variant = 'default',
  rightContent,
}: HeaderProps) {
  const { user, signOut } = useAuthStore();

  // 로고 클릭 시 홈으로 이동
  const handleLogoClick = () => {
    onNavigate?.('home');
  };

  const handleLogout = async () => {
    await signOut();
  };

  const isTransparent = variant === 'transparent';

  return (
    <header
      className={`sticky top-0 z-50 ${
        isTransparent ? 'bg-transparent' : 'bg-white/80 backdrop-blur-md border-b border-slate-100'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* 좌측: 로고 (모바일에서만 뒤로가기 버튼 표시) */}
        <div className="flex items-center gap-4">
          {showBack && isMobile && onBack ? (
            <>
              <button
                onClick={onBack}
                className={`group p-2 -ml-2 rounded-full transition-colors ${
                  isTransparent
                    ? 'bg-white/20 backdrop-blur-md hover:bg-white/30'
                    : 'hover:bg-slate-100'
                }`}
              >
                <ChevronLeft
                  className={`w-6 h-6 transition-colors ${
                    isTransparent ? 'text-white' : 'text-slate-400 group-hover:text-black'
                  }`}
                />
              </button>
              {subtitle && (
                <span
                  className={`text-sm font-bold uppercase tracking-widest ${
                    isTransparent ? 'text-white/80' : 'text-slate-400'
                  }`}
                >
                  {subtitle}
                </span>
              )}
            </>
          ) : (
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isTransparent ? 'bg-white/20 backdrop-blur-md' : 'bg-black'
                }`}
              >
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span
                className={`text-lg font-bold tracking-tight ${isTransparent ? 'text-white' : ''}`}
              >
                A2A.
              </span>
            </button>
          )}
        </div>

        {/* 우측: 커스텀 콘텐츠 또는 기본 네비게이션 */}
        {rightContent
          ? rightContent
          : !showBack &&
            variant === 'default' &&
            (isMobile ? (
              <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <Menu className="w-6 h-6" />
              </button>
            ) : (
              <nav className="flex gap-6 text-sm font-medium text-slate-500 items-center">
                {user && (
                  <button
                    onClick={() => onNavigate?.('mytrips')}
                    className="hover:text-black transition-colors"
                  >
                    내 여행
                  </button>
                )}

                {user ? (
                  // 로그인 상태: 이름 + 로그아웃
                  <div className="flex items-center gap-3">
                    <span className="text-black max-w-32 truncate">
                      {user.displayName || user.email?.split('@')[0]}님
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
      </div>
    </header>
  );
}
