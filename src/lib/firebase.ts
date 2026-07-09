import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { UserInput, TripData, DaySchedule, BudgetData } from '@/types/trip';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 앱 초기화 (중복 방지)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Firestore는 undefined 필드를 거부하므로 무시 옵션을 켠다.
// (userInput의 travelMode·isDomestic 등 optional 필드가 undefined인 채
//  저장·공유되면 addDoc이 "Unsupported field value: undefined"로 실패한다)
let db: Firestore;
try {
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  // HMR 등으로 이미 초기화된 경우 기존 인스턴스를 사용한다
  db = getFirestore(app);
}

// Google Provider
const googleProvider = new GoogleAuthProvider();

// ============================================
// 인증 함수들
// ============================================

/**
 * 이메일/비밀번호로 회원가입
 */
export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // 사용자 이름 설정
  if (userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
    await ensureUserDocument(userCredential.user, displayName);
  }

  return userCredential.user;
}

/**
 * 이메일/비밀번호로 로그인
 */
export async function signInWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDocument(userCredential.user);
  return userCredential.user;
}

/**
 * Google로 로그인
 */
export async function signInWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  await ensureUserDocument(userCredential.user);
  return userCredential.user;
}

/**
 * 로그아웃
 */
export async function logOut() {
  await signOut(auth);
}

/**
 * 인증 상태 감지
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Firestore 사용자 프로필 문서 생성/갱신
 */
async function ensureUserDocument(user: User, displayName?: string) {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const now = serverTimestamp();
  const providerIds = user.providerData.map((provider) => provider.providerId);

  const profileData = {
    uid: user.uid,
    email: user.email,
    displayName: displayName || user.displayName || '',
    photoURL: user.photoURL || '',
    providerIds,
    lastLoginAt: now,
    updatedAt: now,
  };

  await setDoc(
    userRef,
    snapshot.exists()
      ? profileData
      : {
          ...profileData,
          createdAt: now,
        },
    { merge: true }
  );
}

// ============================================
// Firestore - 여행 계획 관련 함수들
// ============================================

// Firestore에 저장할 Activity 타입 (icon 제외)
type SavedActivity = Omit<DaySchedule['activities'][0], 'icon'>;

// Firestore에 저장할 DaySchedule 타입 (icon 제외)
type SavedDaySchedule = Omit<DaySchedule, 'activities'> & {
  activities: SavedActivity[];
};

// Firestore에 저장할 여행 데이터 타입 (icon 제외)
export interface SavedTrip {
  id?: string;
  userInput: UserInput;
  tripData: TripData;
  scheduleData: SavedDaySchedule[];
  budgetData: Omit<BudgetData, 'breakdown'> & {
    breakdown: Omit<BudgetData['breakdown'][0], 'icon'>[];
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * 여행 계획 저장
 */
export async function saveTrip(
  userId: string,
  data: Omit<SavedTrip, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const tripsRef = collection(db, 'users', userId, 'trips');
  const docRef = await addDoc(tripsRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * 여행 계획 목록 조회
 */
export async function getTrips(userId: string): Promise<SavedTrip[]> {
  const tripsRef = collection(db, 'users', userId, 'trips');
  const q = query(tripsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SavedTrip[];
}

/**
 * 특정 여행 계획 조회
 */
export async function getTrip(userId: string, tripId: string): Promise<SavedTrip | null> {
  const tripRef = doc(db, 'users', userId, 'trips', tripId);
  const snapshot = await getDoc(tripRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as SavedTrip;
}

/**
 * 여행 계획 수정
 */
export async function updateTrip(
  userId: string,
  tripId: string,
  data: Partial<Omit<SavedTrip, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const tripRef = doc(db, 'users', userId, 'trips', tripId);
  await updateDoc(tripRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 여행 계획 삭제
 */
export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  const tripRef = doc(db, 'users', userId, 'trips', tripId);
  await deleteDoc(tripRef);
}

// ============================================
// Firestore - 공유 여행 관련 함수들
// ============================================

// 공유 여행 데이터 타입
export interface SharedTrip extends Omit<SavedTrip, 'id'> {
  id?: string;
  sharedBy: string; // 공유한 사용자 이름
  sharedAt?: Timestamp;
}

/**
 * 여행 공유하기 (공개 컬렉션에 저장)
 */
export async function shareTrip(data: Omit<SharedTrip, 'id' | 'sharedAt'>): Promise<string> {
  const sharedTripsRef = collection(db, 'shared_trips');
  const docRef = await addDoc(sharedTripsRef, {
    ...data,
    sharedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * 공유된 여행 조회 (누구나 접근 가능)
 */
export async function getSharedTrip(shareId: string): Promise<SharedTrip | null> {
  const tripRef = doc(db, 'shared_trips', shareId);
  const snapshot = await getDoc(tripRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as SharedTrip;
}

/**
 * 최근 공유된 여행 목록 (홈 화면 추천용, 누구나 접근 가능)
 */
export async function getRecentSharedTrips(count = 12): Promise<SharedTrip[]> {
  const sharedTripsRef = collection(db, 'shared_trips');
  const recentQuery = query(sharedTripsRef, orderBy('sharedAt', 'desc'), limit(count));
  const snapshot = await getDocs(recentQuery);

  return snapshot.docs.map(
    (docSnap) =>
      ({
        id: docSnap.id,
        ...docSnap.data(),
      }) as SharedTrip
  );
}

// 타입 내보내기
export type { User };
export { auth, db };
