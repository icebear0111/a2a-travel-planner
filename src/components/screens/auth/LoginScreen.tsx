'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import { useAuthStore } from '@/stores/authStore';

interface LoginScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function LoginScreen({ onNavigate }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signInGoogle, isLoading, error, clearError } = useAuthStore();

  // 에러 발생 시 알림
  useEffect(() => {
    if (error) {
      alert(error);
      clearError();
    }
  }, [error, clearError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      alert('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    const success = await signIn(email, password);
    if (success) {
      onNavigate('home');
    }
  };

  const handleGoogleLogin = async () => {
    const success = await signInGoogle();
    if (success) {
      onNavigate('home');
    }
  };

  return (
    <div className="min-h-screen bg-white font-body text-slate-900">
      <Header variant="login" onNavigate={onNavigate} />

      <div className="max-w-md mx-auto px-6 py-12">
        {/* 타이틀 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">다시 만나서 반가워요</h1>
          <p className="text-slate-500">로그인하고 AI로 여행을 계획하세요</p>
        </div>

        {/* 소셜 로그인 */}
        <div className="space-y-3 mb-8">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border border-slate-200 rounded-xl font-medium hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 계속하기
          </button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-sm text-slate-400">또는</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">이메일</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@example.com"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-slate-300 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-slate-300 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm text-slate-500 hover:text-black transition-colors"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                로그인
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* 회원가입 링크 */}
        <p className="text-center mt-8 text-slate-500">
          아직 계정이 없으신가요?{' '}
          <button
            onClick={() => onNavigate('signup')}
            className="text-black font-semibold hover:underline"
          >
            회원가입
          </button>
        </p>

        {/* 푸터 */}
        <Footer className="mt-12 border-t-0" />
      </div>
    </div>
  );
}
