'use client';

import React, { useState, useEffect } from 'react';
import { useTripStore } from '@/stores/tripStore';

// Components
import HomeScreen from '@/components/HomeScreen';
import LoadingScreen from '@/components/LoadingScreen';

// 아직 만들지 않은 상세 화면들은 일단 Placeholder로 유지 (나중에 구현 예정)
const ResultScreen = ({ setCurrentScreen }: { setCurrentScreen: (screen: string) => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-white">
    <h1 className="text-3xl font-bold mb-4">✨ 여행 계획이 완성되었습니다!</h1>
    <p className="text-slate-500 mb-8">결과 화면 UI는 다음 단계에서 구현할 예정입니다.</p>
    <button
      onClick={() => setCurrentScreen('home')}
      className="px-6 py-3 bg-black text-white rounded-full hover:bg-slate-800 transition-colors"
    >
      처음으로 돌아가기
    </button>
  </div>
);

const DetailScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="p-8">
    상세 화면<button onClick={onBack}>뒤로</button>
  </div>
);
const EditScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="p-8">
    편집 화면<button onClick={onBack}>뒤로</button>
  </div>
);
const ShareScreen = ({ onBack }: { onBack: () => void }) => (
  <div className="p-8">
    공유 화면<button onClick={onBack}>뒤로</button>
  </div>
);

export default function Home() {
  const { setIsMobile } = useTripStore();
  const [currentScreen, setCurrentScreen] = useState('home');
  // 로컬 상태로 isMobile 관리 (초기 렌더링 매칭을 위해)
  const [localIsMobile, setLocalIsMobile] = useState(false);

  // 1. 윈도우 크기 감지 (반응형 처리)
  useEffect(() => {
    const handleResize = () => {
      // 768px 미만이면 모바일로 간주
      const mobile = window.innerWidth < 768;
      setLocalIsMobile(mobile);
      setIsMobile(mobile); // 전역 스토어 업데이트
    };

    // 초기 실행
    handleResize();

    // 리사이즈 이벤트 등록
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  // 2. 화면 렌더링 로직
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen
            isMobile={localIsMobile}
            onStartPlanning={() => setCurrentScreen('loading')}
          />
        );
      case 'loading':
        return (
          <LoadingScreen isMobile={localIsMobile} onComplete={() => setCurrentScreen('result')} />
        );
      case 'result':
        return <ResultScreen setCurrentScreen={setCurrentScreen} />;
      case 'detail':
        return <DetailScreen onBack={() => setCurrentScreen('result')} />;
      case 'edit':
        return <EditScreen onBack={() => setCurrentScreen('result')} />;
      case 'share':
        return <ShareScreen onBack={() => setCurrentScreen('result')} />;
      default:
        return (
          <HomeScreen
            isMobile={localIsMobile}
            onStartPlanning={() => setCurrentScreen('loading')}
          />
        );
    }
  };

  return (
    // 3. 윈도우 창 프레임 제거 -> 전체 화면 사용
    <main className="min-h-screen w-full bg-white text-slate-900">{renderScreen()}</main>
  );
}
