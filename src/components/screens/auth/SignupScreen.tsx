'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, User } from 'lucide-react';
import Header from '@/components/ui/Header';
import { useAuthStore } from '@/stores/authStore';

interface SignupScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export default function SignupScreen({ onBack, onNavigate }: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const { signUp, isLoading, error, clearError } = useAuthStore();

  // 에러 발생 시 알림
  useEffect(() => {
    if (error) {
      alert(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSignup = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      alert('모든 항목을 입력해주세요.');
      return;
    }

    if (!agreeTerms) {
      alert('이용약관 및 개인정보처리방침에 동의해주세요.');
      return;
    }

    if (password.length < 8) {
      alert('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    const success = await signUp(email, password, name);
    if (success) {
      onNavigate('home');
    }
  };

  return (
    <div className="min-h-screen bg-white font-body text-slate-900">
      <Header variant="signup" onNavigate={onNavigate} />

      <div className="max-w-md mx-auto px-6 py-12">
        {/* 타이틀 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">여행을 시작해볼까요?</h1>
          <p className="text-slate-500">계정을 만들고 AI 여행 플래너를 경험하세요</p>
        </div>

        {/* 이메일 회원가입 폼 */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">이름</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-slate-300 transition-all"
              />
            </div>
          </div>

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
                placeholder="영문, 숫자 포함 8자 이상"
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">비밀번호 확인</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 다시 입력해주세요"
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-slate-300 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </form>

        {/* 약관 동의 */}
        <label className="flex items-start gap-3 my-8 cursor-pointer group">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded border-none outline-none focus:ring-0 cursor-pointer accent-black"
          />
          <span className="text-sm text-slate-600 leading-relaxed">
            <button className="text-black font-medium underline hover:text-slate-600">
              이용약관
            </button>{' '}
            및{' '}
            <button className="text-black font-medium underline hover:text-slate-600">
              개인정보처리방침
            </button>
            에 동의합니다.
          </span>
        </label>

        <button
          onClick={() => handleSignup()}
          disabled={isLoading}
          className="w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              가입하기
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        {/* 로그인 링크 */}
        <p className="text-center mt-8 text-slate-500">
          이미 계정이 있으신가요?{' '}
          <button
            onClick={() => onNavigate('login')}
            className="text-black font-semibold hover:underline"
          >
            로그인
          </button>
        </p>
      </div>
    </div>
  );
}
