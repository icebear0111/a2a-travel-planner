'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Firebase 인증 상태 감지 시작
    const unsubscribe = initialize();

    // 컴포넌트 언마운트 시 구독 해제
    return () => unsubscribe();
  }, [initialize]);

  return <>{children}</>;
}
