/**
 * 일정 생성 품질 평가 하네스
 *
 * 고정 테스트 케이스를 실제 /api/plan-trip 파이프라인에 돌리고
 * ① 규칙 기반 채점(시간 겹침·중복·필수 활동·장소 검증률)과
 * ② LLM 저지 채점(컨셉 부합·현실성·설명 품질·동선)으로 점수를 매긴다.
 *
 * 사용법:
 *   npm run dev            # 별도 터미널에서 서버 실행
 *   npm run eval           # 전체 케이스 1회씩
 *   npm run eval -- --runs 3 --case tokyo   # 특정 케이스만 3회 반복
 *
 * 결과는 scripts/eval-results/에 저장되며, 직전 결과와 점수 차이를 보여준다.
 */

import fs from 'node:fs';
import path from 'node:path';

// ============================================
// 설정
// ============================================

const BASE_URL = process.env.EVAL_BASE_URL || 'http://localhost:3000';
const RESULTS_DIR = path.join(__dirname, 'eval-results');

interface EvalCase {
  id: string;
  label: string;
  concepts: string[];
  userRequest: Record<string, unknown>;
}

const flightInput = (departureDate: string, returnDate: string, extra?: object) => ({
  originAirportCode: '',
  destAirportCode: '',
  price: 0,
  departureDate,
  departureTime: '09:00',
  returnDate,
  returnTime: '18:00',
  ...extra,
});

const noHotel = [{ id: '1', name: '', price: 0, checkIn: '', checkOut: '' }];

const CASES: EvalCase[] = [
  {
    id: 'gangneung',
    label: '강릉 · 기차 2일 · 자연+여유',
    concepts: ['nature', 'relaxed'],
    userRequest: {
      destination: '강릉',
      isDomestic: true,
      travelMode: 'train',
      useRentalCar: false,
      travelStyle: ['nature', 'relaxed'],
      mustVisitPlaces: [],
      flight: flightInput('2026-07-19', '2026-07-20'),
      hotels: noHotel,
    },
  },
  {
    id: 'jeju',
    label: '제주 · 항공+렌터카 3일 · 맛집',
    concepts: ['food'],
    userRequest: {
      destination: '제주',
      isDomestic: true,
      travelMode: 'flight',
      useRentalCar: true,
      travelStyle: ['food'],
      mustVisitPlaces: [],
      flight: flightInput('2026-07-17', '2026-07-19'),
      hotels: noHotel,
    },
  },
  {
    id: 'pyeongchang',
    label: '평창 · 버스 2일 · 여유 (미등록 여행지)',
    concepts: ['relaxed'],
    userRequest: {
      destination: '평창',
      isDomestic: true,
      travelMode: 'bus',
      useRentalCar: false,
      travelStyle: ['relaxed'],
      mustVisitPlaces: [],
      flight: flightInput('2026-07-19', '2026-07-20'),
      hotels: noHotel,
    },
  },
  {
    id: 'tokyo',
    label: '도쿄 · 3일 · 맛집+문화+쇼핑',
    concepts: ['food', 'culture', 'shopping'],
    userRequest: {
      destination: '도쿄',
      isDomestic: false,
      useRentalCar: false,
      travelStyle: ['food', 'culture', 'shopping'],
      mustVisitPlaces: ['팀랩 플래닛'],
      flight: flightInput('2026-07-24', '2026-07-26', {
        originAirportCode: 'ICN',
        destAirportCode: 'NRT',
        price: 350000,
        departureTime: '10:00',
      }),
      hotels: noHotel,
    },
  },
  {
    id: 'paris',
    label: '파리 · 5일 · 문화 + 필수 방문지 2곳',
    concepts: ['culture'],
    userRequest: {
      destination: '파리',
      isDomestic: false,
      useRentalCar: false,
      travelStyle: ['culture'],
      mustVisitPlaces: ['루브르 박물관', '에펠탑'],
      flight: flightInput('2026-09-10', '2026-09-14', {
        originAirportCode: 'ICN',
        destAirportCode: 'CDG',
        price: 1500000,
        departureTime: '10:00',
      }),
      hotels: noHotel,
    },
  },
];

// ============================================
// 파이프라인 실행 (SSE 수신)
// ============================================

interface EvalActivity {
  id: string;
  time: string;
  duration: string;
  type: string;
  title: string;
  location: string;
  desc: string;
  price: number;
  isPlaceValidated?: boolean;
}

interface EvalDay {
  day: number;
  activities: EvalActivity[];
}

interface PipelineOutput {
  itinerary: EvalDay[];
  enriched: EvalDay[] | null;
  budgetStatus: string;
  elapsedMs: number;
}

async function runPipeline(userRequest: Record<string, unknown>): Promise<PipelineOutput> {
  const startedAt = Date.now();
  const response = await fetch(`${BASE_URL}/api/plan-trip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userRequest }),
  });
  if (!response.ok || !response.body) {
    throw new Error(`파이프라인 호출 실패: HTTP ${response.status}`);
  }

  let itinerary: EvalDay[] = [];
  let enriched: EvalDay[] | null = null;
  let budgetStatus = 'UNKNOWN';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');

      if (!chunk.startsWith('data:')) continue;
      const event = JSON.parse(chunk.slice(5));
      if (event.type === 'result') {
        itinerary = event.data.itinerary;
        budgetStatus = event.data.budget?.status || 'UNKNOWN';
      } else if (event.type === 'enrichment') {
        enriched = event.data.itinerary;
      } else if (event.type === 'error') {
        throw new Error(`파이프라인 오류: ${event.message}`);
      }
    }
  }

  if (itinerary.length === 0) throw new Error('result 이벤트를 받지 못했습니다.');
  return { itinerary, enriched, budgetStatus, elapsedMs: Date.now() - startedAt };
}

// ============================================
// ① 규칙 기반 채점
// ============================================

const LOGISTICS_TYPES = new Set(['flight', 'transport', 'hotel']);
const ACTIVITY_SUFFIX = /(산책|관람|방문|야경|투어|감상|나들이|구경|체험|휴식)/g;

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const parseDurationMinutes = (duration: string) => {
  const hours = /(\d+)\s*h/.exec(duration)?.[1];
  const minutes = /(\d+)\s*m/.exec(duration)?.[1];
  if (!hours && !minutes) return null;
  return Number(hours || 0) * 60 + Number(minutes || 0);
};

const normalizeKey = (title: string) =>
  title
    .toLowerCase()
    .replace(/^(아침|점심|저녁|카페|이동|중식|석식)\s*:\s*/, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(ACTIVITY_SUFFIX, '');

interface RuleReport {
  passed: number;
  total: number;
  violations: string[];
  placeValidationRate: number | null;
}

function runRuleChecks(output: PipelineOutput, totalDays: number): RuleReport {
  const violations: string[] = [];
  let passed = 0;
  let total = 0;
  const check = (ok: boolean, message: string) => {
    total += 1;
    if (ok) passed += 1;
    else violations.push(message);
  };

  const { itinerary } = output;

  // 1. 날짜 수
  check(itinerary.length === totalDays, `날짜 수 불일치 (${itinerary.length}/${totalDays})`);

  for (const day of itinerary) {
    const acts = day.activities;
    if (acts.length === 0) {
      check(false, `Day ${day.day} 활동 없음`);
      continue;
    }

    // 2. 시간 형식·시간순·겹침
    const badTime = acts.filter((a) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.time));
    check(badTime.length === 0, `Day ${day.day} 시간 형식 위반 ${badTime.length}건`);

    let overlap = 0;
    for (let i = 0; i < acts.length - 1; i++) {
      const dur = parseDurationMinutes(acts[i].duration);
      if (dur === null) continue;
      if (toMinutes(acts[i].time) + dur > toMinutes(acts[i + 1].time)) overlap += 1;
    }
    check(overlap === 0, `Day ${day.day} 시간 겹침 ${overlap}건`);

    const sorted = [...acts].every(
      (a, i) => i === 0 || toMinutes(a.time) >= toMinutes(acts[i - 1].time)
    );
    check(sorted, `Day ${day.day} 시간순 정렬 위반`);

    // 3. 식사 라벨-시간 일치
    const mealWindows: Record<string, [number, number]> = {
      아침: [6 * 60 + 30, 10 * 60 + 30],
      점심: [11 * 60, 14 * 60 + 30],
      저녁: [17 * 60, 21 * 60],
    };
    let mealMismatch = 0;
    for (const act of acts) {
      const label = /^(아침|점심|저녁)\s*:/.exec(act.title)?.[1];
      if (!label) continue;
      const [lo, hi] = mealWindows[label];
      const t = toMinutes(act.time);
      if (t < lo || t > hi) mealMismatch += 1;
    }
    check(mealMismatch === 0, `Day ${day.day} 식사 라벨-시간 불일치 ${mealMismatch}건`);
  }

  // 4. 첫날: 저녁 포함 (17시 이전에 현지 활동이 시작된 경우만)
  const day1 = itinerary[0];
  if (day1) {
    const onSiteEarly = day1.activities.some(
      (a) => !LOGISTICS_TYPES.has(a.type) && toMinutes(a.time) < 17 * 60
    );
    if (onSiteEarly) {
      const hasDinner = day1.activities.some(
        (a) => a.type === 'food' && toMinutes(a.time) >= 16 * 60 + 30
      );
      check(hasDinner, 'Day 1 저녁 식사 누락');
    }
  }

  // 5. 마지막 날: 체크아웃 + 귀환편이 마지막 활동
  const lastDay = itinerary[itinerary.length - 1];
  if (lastDay && totalDays > 1) {
    const hasCheckout = lastDay.activities
      .slice(0, 3)
      .some((a) => a.type === 'hotel' && /체크아웃/.test(a.title));
    check(hasCheckout, '마지막 날 체크아웃 활동 누락');

    const lastAct = lastDay.activities[lastDay.activities.length - 1];
    check(
      Boolean(lastAct) && /귀국|귀경|귀가/.test(lastAct.title),
      `마지막 활동이 귀환편이 아님 ("${lastAct?.title}")`
    );

    const inbound = lastDay.activities
      .slice(0, -1)
      .filter((a) => /출국|입국|탑승:/.test(a.title)).length;
    check(inbound === 0, `마지막 날 상행/출국 교통편 환각 ${inbound}건`);
  }

  // 6. 날짜 간 장소 중복 (물류 제외)
  const seen = new Map<string, number>();
  const dupes: string[] = [];
  for (const day of itinerary) {
    for (const act of day.activities) {
      if (LOGISTICS_TYPES.has(act.type)) continue;
      const key = normalizeKey(act.title);
      if (!key) continue;
      const firstDay = seen.get(key);
      if (firstDay !== undefined && firstDay !== day.day) dupes.push(act.title);
      else seen.set(key, day.day);
    }
  }
  check(dupes.length === 0, `날짜 간 장소 중복: ${dupes.join(', ')}`);

  // 7. 예산 검증 통과
  check(output.budgetStatus === 'PASS', `예산 검증 ${output.budgetStatus}`);

  // 8. 장소 검증률 (enrichment 기준, 점수 아닌 참고 지표)
  let placeValidationRate: number | null = null;
  if (output.enriched) {
    const targets = output.enriched
      .flatMap((d) => d.activities)
      .filter((a) => !['flight', 'transport'].includes(a.type));
    if (targets.length > 0) {
      placeValidationRate =
        targets.filter((a) => a.isPlaceValidated).length / targets.length;
    }
  }

  return { passed, total, violations, placeValidationRate };
}

// ============================================
// ② LLM 저지 채점
// ============================================

interface JudgeScores {
  conceptFit: number;
  realism: number;
  descQuality: number;
  routeCoherence: number;
  issues: string[];
}

function loadOpenAiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const match = /^OPENAI_API_KEY=(.+)$/m.exec(fs.readFileSync(envPath, 'utf8'));
    if (match) return match[1].trim();
  }
  throw new Error('OPENAI_API_KEY를 찾을 수 없습니다 (.env.local 또는 환경 변수).');
}

async function judgeTrip(
  evalCase: EvalCase,
  itinerary: EvalDay[],
  apiKey: string
): Promise<JudgeScores> {
  const compact = itinerary
    .map(
      (day) =>
        `Day ${day.day}:\n` +
        day.activities
          .map((a) => `  ${a.time} (${a.duration}) [${a.type}] ${a.title} ${a.price}원 — ${a.desc}`)
          .join('\n')
    )
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      // 채점 일관성을 위해 약간의 추론을 켠다 (추론 모드에선 temperature 지정 불가)
      reasoning_effort: 'low',
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'trip_judgement',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['conceptFit', 'realism', 'descQuality', 'routeCoherence', 'issues'],
            properties: {
              conceptFit: { type: 'integer', minimum: 1, maximum: 5 },
              realism: { type: 'integer', minimum: 1, maximum: 5 },
              descQuality: { type: 'integer', minimum: 1, maximum: 5 },
              routeCoherence: { type: 'integer', minimum: 1, maximum: 5 },
              issues: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      messages: [
        {
          role: 'system',
          content: `당신은 여행 일정 품질 심사관입니다. 아래 루브릭으로 1~5점을 매기세요 (5=완벽, 3=보통, 1=심각).

- conceptFit: 선택된 여행 컨셉이 일정 전반에 충분히 반영됐는가 (컨셉 관련 활동의 비중과 배치)
- realism: 실존 장소인가, 영업시간·계절·요일에 맞는가, 체류 시간과 가격이 현실적인가
- descQuality: 활동 설명이 구체적이고 실용적인 팁을 담았는가 (뻔한 문구는 감점)
- routeCoherence: 하루 동선이 한 지역에 묶여 있고 이동이 자연스러운가, 날짜 간 지역이 잘 나뉘었는가

issues에는 발견한 구체적 문제를 한국어로 적으세요 (없으면 빈 배열).`,
        },
        {
          role: 'user',
          content: `목적지: ${evalCase.userRequest.destination}
선택 컨셉: ${evalCase.concepts.join(', ')}
필수 방문지: ${(evalCase.userRequest.mustVisitPlaces as string[]).join(', ') || '없음'}

일정:
${compact}`,
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`저지 호출 실패: ${data.error?.message || response.status}`);
  }
  return JSON.parse(data.choices[0].message.content) as JudgeScores;
}

// ============================================
// 리포트
// ============================================

interface CaseResult {
  id: string;
  label: string;
  runs: number;
  rule: { passed: number; total: number; violations: string[] };
  judge: Omit<JudgeScores, 'issues'>;
  judgeIssues: string[];
  placeValidationRate: number | null;
  avgElapsedMs: number;
}

const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const fmtScore = (n: number) => n.toFixed(1);

function printReport(results: CaseResult[], previous: CaseResult[] | null) {
  const delta = (id: string, pick: (r: CaseResult) => number, current: number) => {
    const prev = previous?.find((r) => r.id === id);
    if (!prev) return '';
    const diff = current - pick(prev);
    if (Math.abs(diff) < 0.05) return '';
    return diff > 0 ? ` (▲${fmtScore(diff)})` : ` (▼${fmtScore(-diff)})`;
  };

  console.log('\n================ 평가 리포트 ================\n');
  for (const r of results) {
    const j = r.judge;
    console.log(`■ ${r.label}  [${r.runs}회 평균, ${(r.avgElapsedMs / 1000).toFixed(1)}s/회]`);
    console.log(
      `  규칙: ${r.rule.passed}/${r.rule.total} 통과` +
        (r.placeValidationRate !== null
          ? ` · 장소 검증률 ${(r.placeValidationRate * 100).toFixed(0)}%`
          : '')
    );
    console.log(
      `  저지: 컨셉 ${fmtScore(j.conceptFit)}${delta(r.id, (p) => p.judge.conceptFit, j.conceptFit)}` +
        ` · 현실성 ${fmtScore(j.realism)}${delta(r.id, (p) => p.judge.realism, j.realism)}` +
        ` · 설명 ${fmtScore(j.descQuality)}${delta(r.id, (p) => p.judge.descQuality, j.descQuality)}` +
        ` · 동선 ${fmtScore(j.routeCoherence)}${delta(r.id, (p) => p.judge.routeCoherence, j.routeCoherence)}`
    );
    for (const v of r.rule.violations) console.log(`  ⚠️ 규칙 위반: ${v}`);
    for (const issue of r.judgeIssues.slice(0, 4)) console.log(`  💬 저지: ${issue}`);
    console.log();
  }

  const totalRule = results.reduce(
    (acc, r) => ({ p: acc.p + r.rule.passed, t: acc.t + r.rule.total }),
    { p: 0, t: 0 }
  );
  const judgeAvg = avg(
    results.flatMap((r) => [
      r.judge.conceptFit,
      r.judge.realism,
      r.judge.descQuality,
      r.judge.routeCoherence,
    ])
  );
  console.log(
    `종합: 규칙 ${totalRule.p}/${totalRule.t} 통과 · 저지 평균 ${fmtScore(judgeAvg)}/5\n`
  );
}

// ============================================
// 메인
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const runsArg = args.indexOf('--runs');
  const runs = runsArg !== -1 ? Math.max(1, Number(args[runsArg + 1]) || 1) : 1;
  const caseArg = args.indexOf('--case');
  const caseFilter = caseArg !== -1 ? args[caseArg + 1] : null;

  const cases = caseFilter ? CASES.filter((c) => c.id === caseFilter) : CASES;
  if (cases.length === 0) {
    console.error(`케이스 없음: ${caseFilter} (가능: ${CASES.map((c) => c.id).join(', ')})`);
    process.exit(1);
  }

  // 서버 확인
  try {
    await fetch(BASE_URL, { method: 'HEAD' });
  } catch {
    console.error(`❌ ${BASE_URL} 에 연결할 수 없습니다. 먼저 "npm run dev"로 서버를 실행하세요.`);
    process.exit(1);
  }

  const apiKey = loadOpenAiKey();
  const results: CaseResult[] = [];

  for (const evalCase of cases) {
    console.log(`\n▶ ${evalCase.label} — ${runs}회 실행 중...`);
    const ruleReports: RuleReport[] = [];
    const judgeReports: JudgeScores[] = [];
    const elapsed: number[] = [];

    const flight = evalCase.userRequest.flight as { departureDate: string; returnDate: string };
    const totalDays =
      Math.ceil(
        (new Date(flight.returnDate).getTime() - new Date(flight.departureDate).getTime()) /
          86400000
      ) + 1;

    for (let i = 0; i < runs; i++) {
      const output = await runPipeline(evalCase.userRequest);
      elapsed.push(output.elapsedMs);
      ruleReports.push(runRuleChecks(output, totalDays));
      judgeReports.push(await judgeTrip(evalCase, output.itinerary, apiKey));
      console.log(`  ${i + 1}/${runs} 완료 (${(output.elapsedMs / 1000).toFixed(1)}s)`);
    }

    results.push({
      id: evalCase.id,
      label: evalCase.label,
      runs,
      rule: {
        passed: Math.min(...ruleReports.map((r) => r.passed)),
        total: ruleReports[0].total,
        violations: [...new Set(ruleReports.flatMap((r) => r.violations))],
      },
      judge: {
        conceptFit: avg(judgeReports.map((j) => j.conceptFit)),
        realism: avg(judgeReports.map((j) => j.realism)),
        descQuality: avg(judgeReports.map((j) => j.descQuality)),
        routeCoherence: avg(judgeReports.map((j) => j.routeCoherence)),
      },
      judgeIssues: [...new Set(judgeReports.flatMap((j) => j.issues))],
      placeValidationRate: ruleReports[ruleReports.length - 1].placeValidationRate,
      avgElapsedMs: avg(elapsed),
    });
  }

  // 직전 결과와 비교 후 저장
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const latestPath = path.join(RESULTS_DIR, 'latest.json');
  let previous: CaseResult[] | null = null;
  if (fs.existsSync(latestPath)) {
    try {
      previous = JSON.parse(fs.readFileSync(latestPath, 'utf8')).results;
    } catch {
      previous = null;
    }
  }

  printReport(results, previous);

  const payload = { ranAt: new Date().toISOString(), runs, results };
  fs.writeFileSync(latestPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(
    path.join(RESULTS_DIR, `${payload.ranAt.replace(/[:.]/g, '-')}.json`),
    JSON.stringify(payload, null, 2)
  );
  console.log(`결과 저장: scripts/eval-results/latest.json`);
}

main().catch((error) => {
  console.error('❌ 평가 실패:', error);
  process.exit(1);
});
