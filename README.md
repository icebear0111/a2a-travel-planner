# ✈️ TrAI — AI 여행 플래너

> 여행지와 날짜, 이동수단만 고르면 AI 멀티 에이전트가 일자별 동선부터 예산·지도까지 완성된 여행 일정을 만들어주는 서비스입니다. 국내여행과 해외여행을 모두 지원합니다.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--5.4-412991?logo=openai)

---

## 🖼️ 미리보기

![홈 화면](docs/screenshots/home.png)

![결과 화면 — 지도 탭](docs/screenshots/map.png)

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/setup.png" alt="여행 설정 — 국내/해외 선택과 여행지 입력" /></td>
    <td width="50%"><img src="docs/screenshots/login.png" alt="로그인 화면" /></td>
  </tr>
  <tr>
    <td align="center"><sub>여행 설정 1단계 · 국내/해외 선택과 여행지 입력</sub></td>
    <td align="center"><sub>로그인 (이메일 · Google)</sub></td>
  </tr>
</table>

---

## 💡 어떤 서비스인가요?

여행 계획은 교통·숙소·동선·예산을 동시에 맞춰야 하는 복잡한 퍼즐입니다. 블로그와 지도를 오가며 며칠씩 걸리던 이 과정을, TrAI는 대화형 입력 몇 번과 수십 초의 생성으로 줄입니다.

결과물은 단순한 장소 목록이 아니라 **시간 단위 타임라인, 실측 이동시간이 반영된 지도 동선, 항공·숙소·활동별 예산**까지 갖춘 완성형 일정입니다. 마음에 들면 저장하고, 링크 하나로 공유하고, 캘린더에 바로 넣을 수 있습니다.

---

## ✨ 주요 기능

### 1. 여행지 추천 — 어디로 갈지부터 고민이라면

- 홈의 **추천 일정**에는 다른 사용자들이 실제로 만들어 공유한 여행이 방문할 때마다 랜덤으로 소개되어, 클릭 한 번으로 완성된 일정을 구경할 수 있습니다
- **AI 여행지 추천**은 여행 스타일·동행·기간·예산·관심사를 입력받아, 출발 시기의 계절 적합성까지 고려한 서로 다른 성격의 여행지 3곳을 제안합니다. 마음에 드는 곳을 고르면 그대로 설정 플로우로 이어집니다

### 2. 여행 설정 — 6단계 대화형 입력

| 단계 | 입력 |
|---|---|
| ① 여행지 | 🚗 국내 / ✈️ 해외 선택 + 여행지 입력 (인기 여행지 칩 제공) |
| ② 날짜 | 달력에서 출발일·도착일 선택 |
| ③ 교통 | 국내: **항공·기차·버스·자차** 중 선택 — 노선·소요시간·요금 자동 구성<br>해외: 예약한 항공편 입력 또는 "아직 예약 안 함" |
| ④ 숙소 | 예약한 숙소 입력 또는 "예약 안 함" — 미입력 시 AI가 위치·예산에 맞는 숙소 추천 |
| ⑤ 여행 컨셉 | 맛집·자연/힐링·문화/역사·쇼핑·알찬 일정 등 **최대 3개 조합** + 현지 렌터카 이용 여부 |
| ⑥ 필수 방문지 | 꼭 가고 싶은 장소 등록 — 일정에 반드시, 단 한 번만 배치 |

- 국내여행은 어떤 여행지든 4가지 이동수단을 동일하게 지원합니다. 주요 여행지는 내장 노선 데이터로, 그 외 지역은 AI가 실운행 노선 기준으로 교통편을 추정합니다
- 렌터카를 선택하면 일정에 픽업·반납이 자동 배치되고 하루 동선이 차량 기준(넓은 반경·주차 편의)으로 구성됩니다

### 3. AI 일정 생성 — 실시간 스트리밍

- 5개 AI 에이전트가 분담해 **일자별 분 단위 타임라인**을 만듭니다 (아래 아키텍처 참고)
- 각 일차의 실제 날짜·요일·계절을 반영합니다 — 월요일엔 휴관 명소를 피하고, 한여름엔 한낮 야외 일정을 줄이는 식
- 실존하는 장소만 편성하며, 모든 활동에는 "대표 메뉴, 예약 필요 여부, 덜 붐비는 시간대" 같은 **실용 팁 한 줄**이 붙습니다
- 생성 과정이 실시간으로 스트리밍되어, **첫날 일정이 완성되는 즉시** 결과 화면으로 전환되고 나머지 날짜가 이어서 채워집니다

### 4. 결과 확인 — 일정 · 지도 · 예산 3탭

- **일정 탭** — 활동별 시간·소요·비용이 담긴 타임라인. 활동을 누르면 장소 정보와 상세 설명 확인
- **지도 탭** — 하루 동선을 번호 마커와 경로선으로 시각화. 구간별 **실측 이동시간·거리**와 함께, 총 이동·최장 구간·장소 검증률을 종합한 **동선 품질 점수**(우수/양호/부담)를 제공
- **예산 탭** — 교통·숙소·활동으로 나눈 전체 예산 브레이크다운. 예산 수준을 넘으면 생성 단계에서 자동으로 동선을 재조정

### 5. 일정 편집

- 완성된 일정에서 활동의 제목·시간·비용·설명을 자유롭게 수정하고, 삭제하거나 새 활동(식사·관광·쇼핑 등)을 추가할 수 있습니다
- 편집할 때마다 예산이 자동으로 재계산됩니다

### 6. 저장 · 공유 · 내보내기

- **내 여행** — 로그인(이메일 또는 Google)하면 일정을 저장하고 언제든 다시 열람·삭제
- **공유** — 공개 URL을 만들어 누구에게나 읽기 전용으로 공유. 공유된 여행은 홈의 추천 일정 후보가 됩니다
- **내보내기** — PDF 다운로드, Google Calendar 추가, Apple/Outlook용 `.ics` 파일 다운로드

---

## 🛠️ 어떻게 동작하나요?

### 멀티 에이전트 파이프라인

일정 생성은 하나의 거대한 프롬프트가 아니라, 역할이 다른 5개 에이전트의 협업입니다. `POST /api/plan-trip` SSE 엔드포인트가 전체 흐름을 스트리밍합니다.

```
              ┌──────────────┐
  UserInput → │ 1. Intent    │  국내/해외·이동수단·기간·계절·예산 수준 분석 (로컬)
              └──────┬───────┘
          ┌──────────┴──────────┐  서로 독립 → 병렬 실행
          ▼                     ▼
   ┌─────────────┐       ┌─────────────┐
   │ 2. Transport│       │ 3. Hotel    │  교통편(항공·기차·버스·자차) /
   └──────┬──────┘       └──────┬──────┘  숙소 거점 확정
          └──────────┬──────────┘
                     ▼
              ┌──────────────┐
              │ 4. Route     │  일자별 상세 일정 — 날짜별 병렬 생성,
              └──────┬───────┘  완성되는 날짜부터 즉시 스트리밍
                     ▼
              ┌──────────────┐
              │ 5. Budget    │  총예산 검증 → 초과 시 동선 재조정
              └──────────────┘
```

원칙은 **"AI는 꼭 필요한 곳에만"** 입니다. 구조화된 입력 해석(Intent)과 예산 검증(Budget)은 규칙 기반 로컬 로직으로, 주요 노선·국내 여행지 정보는 내장 테이블로 처리합니다. LLM(`gpt-5.4-mini`)은 창의성이 필요한 일정 생성과 로컬 데이터가 없을 때의 폴백에만 사용합니다.

### 프롬프트 설계

Route 에이전트의 목표는 "그럴듯한 일정"이 아니라 **"실제로 따라갈 수 있는 일정"** 입니다.

- **달력 컨텍스트** — 일차별 실제 날짜·요일·계절을 프롬프트에 주입해 휴관일·혼잡도·날씨 적합성을 반영
- **현실성 규칙** — 실존·운영 중인 장소만, 시간 겹침 없이, 현실적인 체류 시간과 2026년 기준 가격으로
- **이동수단별 템플릿** — 첫날은 KTX 탑승/국내선/자차 출발로, 마지막 날은 귀경 편으로 마무리되도록 모드별 분기. 마지막 날에 상행 교통편이 끼어드는 환각은 가드 프롬프트로 차단
- **예산 가이드** — 예산 검증 단계의 하루 활동비 한도를 생성 단계에 미리 전달해 재생성 루프를 최소화
- **중복 방지** — 필수 방문지를 날짜별로 사전 배정하고, 병렬 생성 후 날짜 간 중복 명소를 제거

### 체감 속도

- Transport·Hotel 에이전트 동시 실행, Route는 N일을 날짜별로 병렬 생성
- 여행 메타 → 완성된 날짜 순 → 좌표·이동시간 보강의 3단계 점진 스트리밍으로, 전체 완성을 기다리지 않고 결과를 보여줌

### 지도 정확도

AI가 만든 일정은 "장소 이름 문자열"일 뿐이라, 지도에 올리기 위한 검증 계층을 둡니다.

- **장소 검증** — POI 자연어 검색에 강한 **Places API (New) Text Search** + 목적지 좌표 `locationBias`로 동명의 다른 도시 장소 매칭 방지
- **이동시간** — Directions API 구간별 실측, transit 미제공 환경을 위한 도보·차량 폴백(자차·렌터카 여행은 차량 우선), 24시간 인메모리 캐시
- **인터랙티브 지도** — Maps JavaScript API(`@vis.gl/react-google-maps`) 기반. 활동 타입별 색상 번호 마커, 동선 폴리라인, 타임라인 카드 ↔ 마커 양방향 포커스 연동
- **키 보안** — 브라우저 노출 키는 무료 JS API 전용(리퍼러 제한), 유료 API는 서버 전용 키로 분리

### 애플리케이션 구조

- **SPA 내비게이션** — Next.js App Router 위에서 `?view=` URL 동기화로 11개 화면을 전환하는 단일 페이지 구조, 화면별 지연 로딩
- **상태 관리** — Zustand 단일 스토어(`tripStore`)가 SSE 수신·일정 편집·저장/공유 상태를 관장. 새 여행을 시작하면 이전 입력은 전부 초기화
- **데이터** — Firebase Auth(이메일·Google) + Firestore. 개인 일정(`users/{uid}/trips`)과 공개 공유 일정(`shared_trips`)을 분리 저장

---

## 🧰 기술 스택

**Frontend** — Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Zustand · @vis.gl/react-google-maps

**Backend / AI** — Next.js Route Handlers · OpenAI GPT (`gpt-5.4-mini`) · Server-Sent Events · Firebase Auth / Firestore

**External APIs** — Google Maps Platform (Places · Geocoding · Directions · Maps JavaScript) · Unsplash

---

## 🚀 시작하기

```bash
git clone https://github.com/icebear0111/a2a-travel-planner.git
cd a2a-travel-planner
npm install
npm run dev   # http://localhost:3000
```

`.env.local`에 아래 키가 필요합니다.

```
OPENAI_API_KEY                     # OpenAI API
GOOGLE_MAPS_API_KEY                # 서버 키 — Geocoding · Directions · Places API (New)
NEXT_PUBLIC_GOOGLE_MAPS_KEY        # 브라우저 키 — Maps JavaScript API 전용
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID     # AdvancedMarker용 Map ID
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY    # 여행지 대표 이미지
NEXT_PUBLIC_FIREBASE_*             # Firebase 프로젝트 설정 (API_KEY · AUTH_DOMAIN · PROJECT_ID 등)
```

---

## 🙏 크레딧

[Next.js](https://nextjs.org/) · [OpenAI](https://openai.com/) · [Google Maps Platform](https://developers.google.com/maps) · [Firebase](https://firebase.google.com/) · [Tailwind CSS](https://tailwindcss.com/) · [Lucide Icons](https://lucide.dev/) · [Unsplash](https://unsplash.com/)
