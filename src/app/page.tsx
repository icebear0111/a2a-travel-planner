'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTripStore } from '@/stores/tripStore';

import HomeScreen from '@/components/screens/home/HomeScreen';

const SetupScreen = dynamic(() => import('@/components/screens/setup/SetupScreen'));
const LoadingScreen = dynamic(() => import('@/components/screens/loading/LoadingScreen'));
const ResultScreen = dynamic(() => import('@/components/screens/result/ResultScreen'));
const DetailScreen = dynamic(() => import('@/components/screens/detail/DetailScreen'));
const EditScreen = dynamic(() => import('@/components/screens/edit/EditScreen'));
const ShareScreen = dynamic(() => import('@/components/screens/share/ShareScreen'));
const LoginScreen = dynamic(() => import('@/components/screens/auth/LoginScreen'));
const SignupScreen = dynamic(() => import('@/components/screens/auth/SignupScreen'));
const MyTripsScreen = dynamic(() => import('@/components/screens/trips/MyTripsScreen'));
const SharedTripScreen = dynamic(() => import('@/components/screens/shared/SharedTripScreen'));

export default function Home() {
  const { setIsMobile } = useTripStore();

  // 1. 화면 상태 관리
  const [currentScreen, setCurrentScreen] = useState('home');
  const [localIsMobile, setLocalIsMobile] = useState(false);
  const [sharedTripId, setSharedTripId] = useState<string | null>(null);

  // ==================================================================
  // 🚀 [핵심] 브라우저 히스토리(뒤로가기) 연동 로직
  // ==================================================================

  // (1) 화면 이동 함수
  const navigateTo = (screen: string) => {
    // 로딩 화면은 히스토리에 남기지 않음 (중간 과정이므로)
    if (screen === 'loading') {
      setCurrentScreen(screen);
      return;
    }

    // 홈이 아닌 다른 화면으로 갈 때만 히스토리 쌓기
    if (screen !== 'home') {
      window.history.pushState({ screen }, '', `?view=${screen}`);
    } else {
      window.history.pushState({ screen: 'home' }, '', '/');
    }

    setCurrentScreen(screen);
  };

  // (2) 브라우저 뒤로가기 버튼 감지 (PopState Event)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const targetScreen = event.state?.screen || 'home';
      setCurrentScreen(targetScreen);
    };

    window.addEventListener('popstate', handlePopState);

    // 초기 로드 시 URL 파라미터 체크
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      const id = params.get('id');

      // 공유 링크 처리
      if (view === 'shared' && id) {
        setSharedTripId(id);
        setCurrentScreen('shared');
      } else if (view) {
        setCurrentScreen(view);
      }
    }, 0);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 2. 윈도우 크기 감지 (반응형)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setLocalIsMobile(mobile);
      setIsMobile(mobile);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  // 3. 화면 렌더링 로직
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen isMobile={localIsMobile} onNavigate={(screen) => navigateTo(screen)} />;

      case 'setup':
        return (
          <SetupScreen
            onBack={() => window.history.back()}
            onNext={() => navigateTo('loading')}
            onNavigate={navigateTo}
          />
        );

      case 'loading':
        return <LoadingScreen onComplete={() => navigateTo('result')} />;

      case 'result':
        return <ResultScreen setCurrentScreen={navigateTo} />;

      case 'detail':
        return <DetailScreen onBack={() => window.history.back()} />;

      case 'edit':
        return <EditScreen onBack={() => window.history.back()} />;

      case 'share':
        return (
          <ShareScreen
            onBack={() => window.history.back()}
            onNavigate={(screen) => navigateTo(screen)}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onBack={() => window.history.back()}
            onNavigate={(screen) => navigateTo(screen)}
          />
        );

      case 'signup':
        return (
          <SignupScreen
            onBack={() => window.history.back()}
            onNavigate={(screen) => navigateTo(screen)}
          />
        );

      case 'mytrips':
        return <MyTripsScreen onNavigate={(screen) => navigateTo(screen)} />;

      case 'shared':
        return sharedTripId ? (
          <SharedTripScreen shareId={sharedTripId} onNavigate={(screen) => navigateTo(screen)} />
        ) : (
          <HomeScreen isMobile={localIsMobile} onNavigate={(screen) => navigateTo(screen)} />
        );

      default:
        return <HomeScreen isMobile={localIsMobile} onNavigate={(screen) => navigateTo(screen)} />;
    }
  };

  return <main className="min-h-screen w-full bg-white text-slate-900">{renderScreen()}</main>;
}
