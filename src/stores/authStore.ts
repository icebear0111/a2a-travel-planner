import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // 액션
  initialize: () => () => void;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  // 앱 시작 시 인증 상태 초기화
  initialize: () => {
    let unsubscribe: (() => void) | undefined;
    let isActive = true;

    import('@/lib/firebase').then(({ onAuthChange }) => {
      if (!isActive) return;

      unsubscribe = onAuthChange((user) => {
        set({ user, isLoading: false });
      });
    }).catch((error) => {
      console.error('인증 초기화 실패:', error);
      set({ isLoading: false });
    });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  },

  // 이메일/비밀번호 회원가입
  signUp: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const { signUpWithEmail } = await import('@/lib/firebase');
      await signUpWithEmail(email, password, name);
      set({ isLoading: false });
      return true;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ isLoading: false, error: message });
      return false;
    }
  },

  // 이메일/비밀번호 로그인
  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { signInWithEmail } = await import('@/lib/firebase');
      await signInWithEmail(email, password);
      set({ isLoading: false });
      return true;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ isLoading: false, error: message });
      return false;
    }
  },

  // Google 로그인
  signInGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const { signInWithGoogle } = await import('@/lib/firebase');
      await signInWithGoogle();
      set({ isLoading: false });
      return true;
    } catch (error) {
      const message = getErrorMessage(error);
      set({ isLoading: false, error: message });
      return false;
    }
  },

  // 로그아웃
  signOut: async () => {
    try {
      const { logOut } = await import('@/lib/firebase');
      await logOut();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  },

  // 에러 초기화
  clearError: () => set({ error: null }),
}));

// Firebase 에러 메시지 한글화
function getErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || '';

  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
    'auth/invalid-email': '유효하지 않은 이메일 형식입니다.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
    'auth/user-not-found': '등록되지 않은 이메일입니다.',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/too-many-requests': '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.',
    'auth/popup-closed-by-user': '로그인 창이 닫혔습니다.',
    'auth/network-request-failed': '네트워크 오류가 발생했습니다.',
  };

  return errorMessages[code] || '오류가 발생했습니다. 다시 시도해주세요.';
}
