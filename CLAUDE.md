# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Development server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint check
```

No test suite is configured. Type-check with `npx tsc --noEmit`.

## Environment Variables

Required in `.env.local`:

```
OPENAI_API_KEY
NEXT_PUBLIC_GOOGLE_MAPS_KEY       # 브라우저 키 — Maps JavaScript API 전용 (리퍼러 제한)
GOOGLE_MAPS_API_KEY               # 서버 키 — Geocoding / Directions / Places API (New)
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID    # AdvancedMarker용 Map ID (미설정 시 DEMO_MAP_ID)
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Google 키는 역할 분리: `NEXT_PUBLIC_` 키는 브라우저 노출 전제(무료 JS API만), 유료 API는 서버 키에만 부여. 서버 코드(`lib/utils/googleMaps.ts`)는 `GOOGLE_MAPS_API_KEY` 우선, 없으면 `NEXT_PUBLIC_` 폴백.

## Architecture

### Navigation (SPA routing)
This is a single-page app despite using Next.js App Router. **All screen switching happens in `src/app/page.tsx`** via a `currentScreen` string state and a `navigateTo()` function that syncs with `window.history` and URL params (`?view=<screen>`). Screens are lazy-loaded with `next/dynamic`. The only API routes are under `src/app/api/`.

Screen names: `home`, `setup`, `loading`, `result`, `detail`, `edit`, `share`, `login`, `signup`, `mytrips`, `shared`.

### AI Agent Pipeline (`/api/plan-trip`)
The core feature is a 5-agent sequential pipeline exposed as a Server-Sent Events (SSE) endpoint. When the user triggers trip generation, `tripStore.generateTrip()` POSTs `UserInput` to this route and streams progress events:

1. **Intent** (`src/lib/agents/intent.ts`) — Normalizes destination (domestic Korean destinations via `constants/destinations.ts` → sets `isDomestic`/`travelMode`), infers duration/season, sets budget level. Fully local, no AI call.
2. **Flight** (`src/lib/agents/flight.ts`) — Builds transport context (`FlightContext.mode`: flight/train/car). Domestic trips use the destinations table (항공/KTX/자차); overseas uses flight routes.
3. **Hotel** (`src/lib/agents/hotel.ts`) — Resolves hotel location and sets the movement anchor.
4. **Route** (`src/lib/agents/route.ts`) — Generates day-by-day itinerary including `mustVisitPlaces`. Validates coordinates via `validateItineraryLocations` (Google Maps).
5. **Budget** (`src/lib/agents/budget.ts`) — Validates total cost; retries route generation once if budget is exceeded.

The store's SSE reader in `tripStore.generateTrip()` handles `progress`, `result`, and `error` event types.

There is also `/api/regenerate-day` for single-day or single-activity AI regeneration (used by `EditScreen`).

### State Management (Zustand)
**`src/stores/tripStore.ts`** is the single source of truth. Key state groups:
- `userInput: UserInput` — user's travel preferences, flight, hotels, must-visit places
- `tripData`, `scheduleData`, `budgetData` — AI-generated results
- `currentTripId`, `savedTrips` — Firestore persistence state
- `currentShareId` — shared trip URL state
- `isGenerating`, `isRegeneratingSchedule`, `regeneratingDay`, `regeneratingActivityId` — loading states

`buildBudgetFromSchedule()` recalculates budget totals from schedule whenever activities are edited. Icon fields (`ReactNode`) are stripped before saving to Firestore via `removeActivityIcon()` and `removeBudgetIcon()`.

**`src/stores/authStore.ts`** — Firebase auth state.

### Firebase (`src/lib/firebase.ts`)
- Auth: email/password + Google OAuth
- Firestore collections:
  - `users/{userId}/trips/{tripId}` — user's saved trips (auth required)
  - `shared_trips/{shareId}` — public read-only shared trips

Firebase functions are dynamically imported inside store actions (`await import('@/lib/firebase')`) to avoid bundling on the server.

### Types
- `src/types/trip.ts` — All domain types: `UserInput`, `Intent`, `Activity`, `DaySchedule`, `TripData`, `BudgetData`, `ActivityType`
- `src/types/api.ts` — SSE stream payload types and API response shapes

`ActivityType` values: `flight | transport | hotel | sightseeing | food | theme | shopping | coffee | etc`. The `icon` field on `Activity` and budget `breakdown` items is a `ReactNode` (runtime only) and must never be persisted.
