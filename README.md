# ✈️ A2A Travel Planner

> AI 에이전트 기반 스마트 여행 계획 서비스

복잡한 여행 계획을 AI에게 맡기세요. 여행지, 항공편, 숙소 정보만 입력하면 AI가 최적의 일정을 자동으로 생성해드립니다.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-11.0-FFCA28?logo=firebase)

---

## 🎯 주요 기능

### 🤖 AI 멀티 에이전트 시스템

5개의 전문 AI 에이전트가 협력하여 완벽한 여행 계획을 생성합니다:

| 에이전트         | 역할                                         |
| ---------------- | -------------------------------------------- |
| **Intent Agent** | 사용자 요청 분석 및 여행 테마/예산 수준 파악 |
| **Flight Agent** | 항공편 정보 분석 및 최적 일정 계산           |
| **Hotel Agent**  | 숙소 위치 분석 및 동선 최적화 기준점 설정    |
| **Route Agent**  | 일자별 상세 일정 및 추천 코스 생성           |
| **Budget Agent** | 총 예산 검증 및 카테고리별 비용 분석         |

### 📝 4단계 여행 설정

직관적인 단계별 입력 흐름으로 여행 정보를 설정합니다:

1. **날짜 선택** - 인라인 캘린더로 출발일/도착일 선택
2. **항공편 정보** - 출발/도착 공항 및 시간 입력 (선택)
3. **숙소 정보** - 숙소 이름 및 체크인/아웃 입력 (선택)
4. **꼭 가고 싶은 장소** - AI가 일정에 반드시 포함

### 🔐 사용자 인증 & 데이터 저장

- **Firebase Authentication**: 이메일/비밀번호 및 Google 로그인
- **Firestore Database**: 여행 일정 저장 및 관리
- **공유 기능**: 고유 URL로 일정 공유 (읽기 전용)

### 📱 주요 화면

- **홈 화면**: 여행지 검색 및 시작
- **설정 화면**: 4단계 여행 정보 입력
- **로딩 화면**: AI 에이전트 실시간 진행 상황
- **결과 화면**: 일정/지도/예산 탭 뷰
- **상세 화면**: 장소별 상세 정보 및 AI 추천 팁
- **편집 화면**: 일정 수정 및 재배열
- **공유 화면**: URL 복사 및 캘린더 추가
- **내 여행**: 저장된 일정 목록 및 관리

---

## 🛠️ 기술 스택

### Frontend

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand 5
- **Icons**: Lucide React
- **Date Picker**: react-datepicker

### Backend

- **API Routes**: Next.js Route Handlers
- **AI**: OpenAI GPT (gpt-5-nano, gpt-5-mini)
- **Streaming**: Server-Sent Events (SSE)
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore

### External APIs

- **OpenAI API**: AI 에이전트 추론
- **Google Maps API**: 지도 임베드 및 경로 안내
- **Unsplash API**: 여행지 이미지

---

## 📁 프로젝트 구조

```
src/
├── app/                          # Next.js App Router
│   ├── api/plan-trip/route.ts    # AI 여행 계획 API (SSE)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── providers/                # Context Providers
│   │   └── AuthProvider.tsx
│   ├── screens/                  # 화면 단위 컴포넌트
│   │   ├── home/
│   │   ├── setup/                # 4단계 설정 화면
│   │   │   ├── SetupScreen.tsx
│   │   │   ├── FlightSection.tsx
│   │   │   └── HotelSection.tsx
│   │   ├── loading/
│   │   ├── result/
│   │   ├── detail/
│   │   ├── edit/
│   │   ├── share/
│   │   ├── shared/               # 공유 일정 뷰어
│   │   ├── trips/                # 내 여행 목록
│   │   └── auth/                 # 로그인/회원가입
│   └── ui/                       # 공통 UI 컴포넌트
│       ├── Header.tsx
│       ├── CustomDatePicker.tsx
│       └── CustomTimePicker.tsx
│
├── constants/                    # 상수 데이터
│   ├── airports.ts
│   └── initialData.ts
│
├── lib/
│   ├── agents/                   # AI 에이전트
│   │   ├── intent.ts
│   │   ├── flight.ts
│   │   ├── hotel.ts
│   │   ├── route.ts
│   │   └── budget.ts
│   ├── firebase.ts               # Firebase 설정 및 함수
│   └── utils/                    # 유틸리티 함수
│       ├── format.ts
│       ├── iconHelpers.ts
│       ├── typeHelpers.ts
│       └── unsplash.ts
│
├── stores/                       # Zustand 스토어
│   ├── tripStore.ts
│   └── authStore.ts
│
├── styles/                       # 스타일 파일
│   └── datepicker.css
│
└── types/                        # TypeScript 타입 정의
    ├── api.ts
    └── trip.ts
```

---

## 🚀 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/a2a-travel-planner.git
cd a2a-travel-planner
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:

```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key

# Unsplash API
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. Authentication에서 이메일/비밀번호 및 Google 로그인 활성화
3. Firestore Database 생성 (프로덕션 모드)
4. 보안 규칙 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자별 여행 저장
    match /users/{userId}/trips/{tripId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // 공유된 여행 (읽기: 모든 사용자, 생성: 로그인 사용자)
    match /shared_trips/{shareId} {
      allow read: if true;
      allow create: if request.auth != null;
    }
  }
}
```

### 5. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 앱을 확인하세요.

---

## 📜 스크립트

| 명령어          | 설명                       |
| --------------- | -------------------------- |
| `npm run dev`   | 개발 서버 실행 (Turbopack) |
| `npm run build` | 프로덕션 빌드              |
| `npm run start` | 프로덕션 서버 실행         |
| `npm run lint`  | ESLint 검사                |

---

## 🔑 API 키 발급 안내

### OpenAI API

1. [OpenAI Platform](https://platform.openai.com/)에서 계정 생성
2. API Keys 메뉴에서 새 키 발급
3. `OPENAI_API_KEY`에 설정

### Google Maps API

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. Maps JavaScript API, Directions API 활성화
3. API 키 발급 후 `NEXT_PUBLIC_GOOGLE_MAPS_KEY`에 설정

### Unsplash API

1. [Unsplash Developers](https://unsplash.com/developers)에서 앱 등록
2. Access Key 발급 후 `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY`에 설정

### Firebase

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. 프로젝트 설정 > 일반 > 내 앱에서 웹 앱 추가
3. Firebase SDK 설정 값을 환경 변수에 복사

---

## 🎨 UI/UX 특징

- **모던 미니멀 디자인**: 깔끔한 흑백 기반 UI
- **4단계 설정 흐름**: 직관적인 단계별 입력
- **인라인 캘린더**: 시각적 날짜 범위 선택
- **반응형 레이아웃**: 모바일/데스크탑 최적화
- **부드러운 애니메이션**: 단계 전환 및 인터랙션
- **실시간 피드백**: AI 진행 상황 시각화
- **브라우저 히스토리 연동**: 뒤로가기 버튼 지원

---

## 🙏 크레딧

- [Next.js](https://nextjs.org/)
- [OpenAI](https://openai.com/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Unsplash](https://unsplash.com/)
