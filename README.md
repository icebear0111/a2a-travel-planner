# ✈️ TrAI — AI 여행 플래너

> 여행지·날짜·항공편·숙소만 입력하면, AI 멀티 에이전트가 일자별 동선부터 예산·지도까지 완성된 여행 일정을 만들어주는 서비스입니다.

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
    <td width="50%"><img src="docs/screenshots/setup.png" alt="여행 설정 — 날짜 선택" /></td>
    <td width="50%"><img src="docs/screenshots/login.png" alt="로그인 화면" /></td>
  </tr>
  <tr>
    <td align="center"><sub>5단계 여행 설정 · 날짜 선택</sub></td>
    <td align="center"><sub>로그인 (이메일 · Google)</sub></td>
  </tr>
</table>

---

## 💡 어떤 서비스인가요?

여행 계획은 항공편·숙소·동선·예산을 동시에 맞춰야 하는 복잡한 퍼즐입니다. TrAI는 이 과정을 대화형 입력 몇 번으로 줄였습니다.

1. **입력** — 목적지와 날짜, (있다면) 예약한 항공편·숙소, 꼭 가고 싶은 장소, 여행 스타일(맛집·힐링·알찬 일정 등)을 5단계로 입력합니다. 아직 여행지를 못 정했다면 AI 여행지 추천을 받을 수도 있습니다.
2. **생성** — AI 에이전트들이 일자별 분 단위 일정을 만들고, 모든 장소를 실제 좌표로 검증하고, 예산을 집계합니다. 먼저 완성된 날짜부터 화면에 실시간으로 흘러 들어옵니다.
3. **확인 & 활용** — 일정·지도·예산 3개 탭에서 결과를 확인합니다. 지도에서는 하루 동선이 번호 마커와 경로선으로 그려지고, 이동시간 실측값과 동선 품질 점수가 함께 표시됩니다. 완성된 일정은 저장하고, 공개 URL로 공유하거나 Google 캘린더·`.ics`로 내보낼 수 있습니다.

---

## 🛠️ 어떻게 만들었나요?

### 멀티 에이전트 파이프라인

일정 생성은 하나의 거대한 프롬프트가 아니라, 역할이 다른 5개 에이전트의 협업으로 설계했습니다. `POST /api/plan-trip` SSE 엔드포인트가 전체 흐름을 스트리밍합니다.

```
              ┌──────────────┐
  UserInput → │ 1. Intent    │  취향·기간·계절·예산 수준 분석 (로컬)
              └──────┬───────┘
          ┌──────────┴──────────┐  서로 독립 → 병렬 실행
          ▼                     ▼
   ┌─────────────┐       ┌─────────────┐
   │ 2. Flight   │       │ 3. Hotel    │  항공 노선 / 숙소 거점 확정
   └──────┬──────┘       └──────┬──────┘
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

원칙은 **"AI는 꼭 필요한 곳에만"** 입니다. 구조화된 입력 해석(Intent)과 예산 검증(Budget)은 규칙 기반 로컬 로직으로 처리하고, 주요 항공 노선은 로컬 테이블을 먼저 씁니다. 실제 LLM(`gpt-5.4-mini`)이 도는 곳은 창의성이 필요한 일정 생성과, 로컬 데이터가 없을 때의 폴백뿐입니다.

### 체감 속도 최적화

"생성 버튼을 누르고 얼마나 기다리는가"를 집요하게 줄였습니다. 단계별 계측(`measureStage`)으로 병목을 실측하면서:

- **병렬화** — Flight·Hotel 동시 실행, Route는 N일을 날짜별로 병렬 생성
- **일자별 점진 스트리밍** — 여행 메타(`trip-meta`)로 결과 화면 골격을 먼저 그리고, 완성되는 날짜부터 `day-result` 이벤트로 흘려보냄. **Day 1이 준비되면 전체 완성을 기다리지 않고 결과 화면으로 전환**
- **선(先)결과 · 후(後)보강** — 지도 좌표·이동시간 검증은 결과 전송을 막지 않고 `enrichment` 이벤트로 이어서 반영, 대표 이미지도 백그라운드 로드
- **숨은 버그 사냥** — 예산 계산에 `NaN`이 전파되어 매번 불필요한 재생성(+5초)이 돌던 버그를 실측 중에 발견·수정

이 과정으로 초기 응답 체감 대기를 **최대 13초대 → 6초대**로 줄였습니다.

### 지도 정확도와 인터랙티브 렌더링

AI가 만든 일정은 "장소 이름 문자열"일 뿐이라, 지도에 올리려면 검증 계층이 필요했습니다.

- **장소 검증** — 주소 변환용 Geocoding 대신 POI 자연어 검색에 강한 **Places API (New) Text Search**를 사용하고, 목적지 좌표 `locationBias`로 동명의 다른 도시 장소 매칭을 방지 (실측 검증률 100%)
- **이동시간** — Directions API로 구간별 실측, transit 미제공 환경을 위한 도보·차량 폴백, 24시간 인메모리 캐시로 반복 호출 절감
- **동선 품질 점수** — 총 이동시간·최장 구간·검증률을 종합해 하루 동선을 `우수/양호/부담`으로 평가, 실측·추정 데이터를 구분 표시
- **인터랙티브 지도** — iframe 임베드에서 **Maps JavaScript API**(`@vis.gl/react-google-maps`)로 전환. 활동 타입별 색상 번호 마커, 동선 폴리라인, 타임라인 카드 ↔ 마커 양방향 포커스 연동
- **키 보안** — 브라우저 노출 키는 무료 JS API 전용(리퍼러 제한), 유료 API는 서버 전용 키로 분리

### 그 외 설계 포인트

- **SPA 내비게이션** — Next.js App Router 위에서 `?view=` URL 동기화로 화면을 전환하는 단일 페이지 구조, 화면별 지연 로딩
- **상태 관리** — Zustand 단일 스토어(`tripStore`)가 SSE 수신·일정 편집·저장/공유 상태를 관장
- **데이터** — Firebase Auth(이메일·Google) + Firestore(개인 일정 / 공개 공유 일정 분리)
- **검증 문화** — 모든 성능·정확도 개선은 실제 파이프라인 실측과 브라우저 자동화(Playwright)로 before/after를 확인하고 반영

---

## 🧰 기술 스택

**Frontend** — Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Zustand · @vis.gl/react-google-maps

**Backend / AI** — Next.js Route Handlers · OpenAI GPT (`gpt-5.4-mini`) · Server-Sent Events · Firebase Auth / Firestore

**External APIs** — Google Maps Platform (Places · Geocoding · Directions · Maps JavaScript) · Unsplash

---

## 🙏 크레딧

[Next.js](https://nextjs.org/) · [OpenAI](https://openai.com/) · [Google Maps Platform](https://developers.google.com/maps) · [Firebase](https://firebase.google.com/) · [Tailwind CSS](https://tailwindcss.com/) · [Lucide Icons](https://lucide.dev/) · [Unsplash](https://unsplash.com/)
