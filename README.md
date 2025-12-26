# ✈️ A2A Travel Planner

> AI 에이전트 기반 스마트 여행 계획 서비스

복잡한 여행 계획을 AI에게 맡기세요. 여행지, 항공편, 숙소 정보만 입력하면 AI가 최적의 일정을 자동으로 생성해드립니다.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)

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

### 📱 주요 화면

- **홈 화면**: 여행지 검색 및 추천 일정
- **설정 화면**: 항공권/숙소 정보 입력
- **로딩 화면**: AI 에이전트 실시간 진행 상황
- **결과 화면**: 일정/지도/예산 탭 뷰
- **상세 화면**: 장소별 상세 정보 및 AI 추천 팁
- **편집 화면**: 일정 수정 및 재배열
- **공유 화면**: PDF 다운로드 및 소셜 공유

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
│   ├── screens/                  # 화면 단위 컴포넌트
│   │   ├── home/
│   │   ├── setup/
│   │   ├── loading/
│   │   ├── result/
│   │   ├── detail/
│   │   ├── edit/
│   │   └── share/
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
│   └── utils/                    # 유틸리티 함수
│       ├── format.ts
│       ├── iconHelpers.ts
│       ├── typeHelpers.ts
│       └── unsplash.ts
│
├── stores/                       # Zustand 스토어
│   └── tripStore.ts
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
```

### 4. 개발 서버 실행

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

---

## 🎨 UI/UX 특징

- **모던 미니멀 디자인**: 깔끔한 흑백 기반 UI
- **반응형 레이아웃**: 모바일/데스크탑 최적화
- **부드러운 애니메이션**: Tailwind CSS transitions
- **실시간 피드백**: AI 진행 상황 시각화
- **브라우저 히스토리 연동**: 뒤로가기 버튼 지원

---

## 📄 라이선스

MIT License

---

## 🙏 크레딧

- [Next.js](https://nextjs.org/)
- [OpenAI](https://openai.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Unsplash](https://unsplash.com/)
