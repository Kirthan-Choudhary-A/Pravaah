/**
 * Metrics Calculator
 * Evaluates the three challenge brief metrics:
 * 1. Dependency-ordering correctness (gold plans in src/data/gold/goldPlans.ts)
 * 2. Plate capture accuracy after read-back (87 typed transcripts)
 * 3. Renewals under scarce slots (1,000 deterministic seeded cases vs naive baseline)
 */

import {
  planScenario,
  compareOptions,
  parsePlate,
  checkPlateClass,
  buildReadBack,
  createConsentRequest,
  grantConsent,
  revokeConsent,
  canAccess,
  reveal,
  appendAudit,
  planHousehold,
  type PlanningEvent,
  type AuditEntry,
  type HouseholdVehicle,
} from '@engine';

import { loadScenario, loadMergedRulePack } from '@data';
import { GOLD_PLANS } from '../data/gold/goldPlans';
import { TRANSCRIPT_BENCHMARK_SET } from '../data/voice-set/transcripts';

import {
  ENGLISH_LETTERS,
  NATO_ALPHABET,
  ENGLISH_DIGITS,
  HINDI_DIGITS,
  TELUGU_DIGITS,
  KANNADA_DIGITS,
  FILLER_WORDS,
  STATE_NAMES,
  CONFIRMATION_PROMPTS,
} from '../i18n/words';

export interface ScenarioCheckResult {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly passed: boolean;
  readonly failureReason?: string;
  readonly finishDay: number;
}

export interface Metric1Result {
  readonly name: string;
  readonly description: string;
  readonly passedCount: number;
  readonly totalCount: number;
  readonly passRate: number;
  /** Scenarios that check task ordering/finish (the rest check plates, consent or voice). */
  readonly orderingTotal: number;
  readonly orderingPassed: number;
  readonly disclaimer: string;
  readonly scenarioResults: readonly ScenarioCheckResult[];
}

export interface TranscriptFailure {
  readonly id: string;
  readonly transcript: string;
  readonly expectedPlate: string | null;
  readonly producedPlate: string | null;
  readonly category: string;
  readonly note: string;
}

export interface Metric2Result {
  readonly name: string;
  readonly description: string;
  readonly totalTranscripts: number;
  readonly firstPassCorrect: number;
  readonly firstPassAccuracy: number;
  /** The right plate was among the readings offered (the user taps it). An upper bound. */
  readonly readBackCorrect: number;
  readonly readBackAccuracy: number;
  /** First reading wrong, so the read-back would be wrong and the user must catch it. */
  readonly wrongFirstReading: number;
  readonly disclaimer: string;
  readonly failures: readonly TranscriptFailure[];
}

export interface HistogramBin {
  readonly label: string;
  readonly range: string;
  readonly pravaahCount: number;
  readonly naiveCount: number;
  readonly pravaahPercent: number;
  readonly naivePercent: number;
}

export interface StrategyResult {
  readonly label: string;
  readonly note: string;
  readonly completedBeforeLSDPercent: number;
  readonly renewedBeforeExpiryPercent: number;
  readonly avgSlackDays: number;
}

export interface Metric3Result {
  readonly name: string;
  readonly description: string;
  /** Assumptions the result depends on, shown next to the numbers. */
  readonly assumptions: readonly string[];
  /** Strategies that separate route choice from scheduling quality. */
  readonly additional: readonly StrategyResult[];
  readonly seed: number;
  readonly sampleSize: number;
  readonly parameterRanges: {
    readonly slotQueueDays: string;
    readonly licenceExpiryDays: string;
    readonly tripDurationDays: string;
    readonly disruptionsModelled: string;
  };
  readonly pravaah: {
    readonly completedBeforeLSDPercent: number;
    readonly renewedBeforeExpiryPercent: number;
    readonly avgSlackDays: number;
  };
  readonly naiveBaseline: {
    readonly completedBeforeLSDPercent: number;
    readonly renewedBeforeExpiryPercent: number;
    readonly avgSlackDays: number;
  };
  readonly histogram: readonly HistogramBin[];
}

export interface AllMetricsReport {
  readonly timestamp: string;
  readonly engineVersion: string;
  readonly metric1: Metric1Result;
  readonly metric2: Metric2Result;
  readonly metric3: Metric3Result;
}

// Reproducible PRNG: Mulberry32
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function evaluateMetric1(): Metric1Result {
  const scenarioResults: ScenarioCheckResult[] = [];
  let passedCount = 0;

  const dict = {
    letterNames: ENGLISH_LETTERS,
    natoAlphabet: NATO_ALPHABET,
    digits: ENGLISH_DIGITS,
    hindiDigits: HINDI_DIGITS,
    teluguDigits: TELUGU_DIGITS,
    kannadaDigits: KANNADA_DIGITS,
    fillerWords: FILLER_WORDS,
  };

  const readBackDict = {
    stateNames: STATE_NAMES,
    confirmationPrompts: CONFIRMATION_PROMPTS,
    englishDigits: ENGLISH_DIGITS,
    hindiDigits: HINDI_DIGITS,
    teluguDigits: TELUGU_DIGITS,
    kannadaDigits: KANNADA_DIGITS,
    natoAlphabet: NATO_ALPHABET,
  };

  for (const spec of GOLD_PLANS) {
    try {
      if (spec.customCheck === 'GS-06') {
        const packDL = loadMergedRulePack('DL');
        const parseRes = parsePlate('DL 1C AB 1234', dict);
        const candidate = parseRes.candidates.find((c) => c.state === 'DL');
        if (!candidate) throw new Error('Candidate DL-01-CAB-1234 not generated');
        const check = checkPlateClass(candidate, 'two-wheeler', packDL);
        if (check.status !== 'mismatch' || check.detectedClass !== 'Car') {
          throw new Error(`Expected class mismatch (Car vs Two-Wheeler), got ${check.status}`);
        }
        passedCount++;
        scenarioResults.push({
          id: spec.id,
          name: spec.name,
          description: spec.description,
          passed: true,
          finishDay: 0,
        });
        continue;
      }

      if (spec.customCheck === 'GS-07') {
        let auditLog: readonly AuditEntry[] = [];
        const now = 1700000000000;
        const reqResult = createConsentRequest({
          id: 'req-001',
          grantorRole: 'Family member',
          granteeRole: 'You',
          vehicleIds: ['KA-03-MJ-4578'],
          scopes: ['view'],
          until: now + 86400000 * 30,
          now,
        });
        if (!reqResult.ok) throw new Error('Consent request failed');
        const grantResult = grantConsent(reqResult.consent, now + 1000, ['view']);
        if (!grantResult.ok) throw new Error('Consent grant failed');
        if (grantResult.auditEntry) auditLog = appendAudit(auditLog, grantResult.auditEntry);

        const householdVehicles: HouseholdVehicle[] = [
          {
            id: 'hv-1',
            ownerRole: 'Family member',
            plate: 'KA-03-MJ-4578',
            vehicleType: 'two-wheeler',
            renewalItems: [
              {
                id: 'puc-1',
                name: 'PUC Renewal',
                dueDate: 30,
                duration: 1,
                basis: 'statute',
                verified: false,
                why: 'PUC valid for 6 months under CMVR Rule 115',
              },
            ],
          },
        ];

        const tasks = planHousehold({
          householdVehicles,
          consents: [grantResult.consent],
          now: now + 2000,
          currentDay: 0,
        });

        if (tasks.length === 0 || !tasks[0]?.name.includes('KA-03-**-**78')) {
          throw new Error('Vehicle plate was not masked in household task name');
        }
        if (canAccess('owner.dl', grantResult.consent, now + 2000)) {
          throw new Error('Unauthorized DL access allowed under view scope');
        }

        const revealResult = reveal({
          field: 'vehicle.pucExpiry',
          rawValue: '2026-11-24',
          purpose: 'Submit NOC application',
          consent: grantResult.consent,
          actor: 'You',
          now: now + 3000,
        });
        if (!revealResult.ok) throw new Error('Reveal failed');
        auditLog = appendAudit(auditLog, revealResult.auditEntry);

        const revokeResult = revokeConsent(grantResult.consent, now + 4000);
        if (!revokeResult.ok) throw new Error('Revoke failed');
        auditLog = appendAudit(auditLog, revokeResult.auditEntry);

        passedCount++;
        scenarioResults.push({
          id: spec.id,
          name: spec.name,
          description: spec.description,
          passed: true,
          finishDay: 0,
        });
        continue;
      }

      if (spec.customCheck === 'GS-08') {
        const rawTranscript = 'kay ay oh three em jay four five seven eight';
        const parseRes = parsePlate(rawTranscript, dict);
        if (!parseRes.success || parseRes.candidates[0]?.formatted !== 'KA-03-MJ-4578') {
          throw new Error(`Parse failed: expected KA-03-MJ-4578, got ${parseRes.candidates[0]?.formatted}`);
        }
        const oFix = parseRes.candidates[0]?.fixes.find((f) => f.original === 'O');
        if (!oFix || oFix.corrected !== '0') {
          throw new Error('O->0 positional correction not recorded in candidate fixes');
        }
        const rb = buildReadBack(parseRes.candidates[0]!, 'en', readBackDict);
        if (!rb.fullSpeech.includes('Karnataka') || !rb.fullSpeech.includes('RTO zero three')) {
          throw new Error('Read-back speech missing state name or RTO code');
        }
        passedCount++;
        scenarioResults.push({
          id: spec.id,
          name: spec.name,
          description: spec.description,
          passed: true,
          finishDay: 0,
        });
        continue;
      }

      // Standard Plan Check
      const scenario = loadScenario(spec.scenarioId);
      const mergedPack = loadMergedRulePack(spec.stateCode);
      const plan = planScenario({
        scenario,
        mergedPack,
        decisions: spec.decisions,
        events: spec.events ?? [],
      });

      // 1. Verify required orderings
      if (spec.requiredOrderings) {
        for (const req of spec.requiredOrderings) {
          const tBefore = plan.tasks.find((t) => t.id === req.before);
          const tAfter = plan.tasks.find((t) => t.id === req.after);
          if (!tBefore) throw new Error(`Task ${req.before} not found in plan`);
          if (!tAfter) throw new Error(`Task ${req.after} not found in plan`);
          if (tBefore.end > tAfter.start) {
            throw new Error(
              `Ordering violation: ${req.before} (ends ${tBefore.end}) must precede ${req.after} (starts ${tAfter.start}). ${req.reason}`
            );
          }
        }
      }

      // 2. Verify forbidden orderings
      if (spec.forbiddenOrderings) {
        for (const forb of spec.forbiddenOrderings) {
          const tBefore = plan.tasks.find((t) => t.id === forb.before);
          const tAfter = plan.tasks.find((t) => t.id === forb.after);
          if (tBefore && tAfter && tBefore.end <= tAfter.start) {
            throw new Error(
              `Forbidden ordering occurred: ${forb.before} ended before ${forb.after} started. ${forb.reason}`
            );
          }
        }
      }

      // 3. Expected Finish Day
      if (spec.expectedFinishDay !== undefined && plan.finish !== spec.expectedFinishDay) {
        throw new Error(`Expected finish on Day ${spec.expectedFinishDay}, got Day ${plan.finish}`);
      }

      // 4. Expected Finishing Task
      if (spec.expectedFinishingTask && plan.finishingTask !== spec.expectedFinishingTask) {
        throw new Error(
          `Expected finishing task ${spec.expectedFinishingTask}, got ${plan.finishingTask}`
        );
      }

      // 5. Degraded mode
      if (spec.expectedDegraded !== undefined && plan.degradedMode !== spec.expectedDegraded) {
        throw new Error(`Expected degradedMode=${spec.expectedDegraded}, got ${plan.degradedMode}`);
      }

      // 6. Unknown tasks
      if (spec.expectedUnknownTasks) {
        for (const uId of spec.expectedUnknownTasks) {
          const ut = plan.tasks.find((t) => t.id === uId);
          if (!ut || !ut.unknown) {
            throw new Error(`Expected task ${uId} to have unknown: true`);
          }
        }
      }

      // 7. Failed checks
      if (spec.expectedFailedChecks) {
        for (const fcId of spec.expectedFailedChecks) {
          const chk = plan.checks.find((c) => c.id === fcId);
          if (!chk || chk.passed) {
            throw new Error(`Expected check ${fcId} to fail`);
          }
        }
      }

      // 8. Added tasks
      if (spec.expectedAddedTasks) {
        for (const atId of spec.expectedAddedTasks) {
          if (!plan.tasks.some((t) => t.id === atId)) {
            throw new Error(`Expected added task ${atId} not found in plan`);
          }
        }
      }

      // 9. Excluded tasks
      if (spec.expectedExcludedTasks) {
        for (const etId of spec.expectedExcludedTasks) {
          if (plan.tasks.some((t) => t.id === etId)) {
            throw new Error(`Excluded task ${etId} was unexpectedly present in plan`);
          }
        }
      }

      passedCount++;
      scenarioResults.push({
        id: spec.id,
        name: spec.name,
        description: spec.description,
        passed: true,
        finishDay: plan.finish,
      });
    } catch (err: unknown) {
      const failureReason = err instanceof Error ? err.message : String(err);
      scenarioResults.push({
        id: spec.id,
        name: spec.name,
        description: spec.description,
        passed: false,
        failureReason,
        finishDay: 0,
      });
    }
  }

  return {
    name: 'Dependency-Ordering Correctness',
    description:
      'Checks each gold scenario against its required and forbidden orderings and expected outcomes.',
    passedCount,
    totalCount: GOLD_PLANS.length,
    orderingTotal: GOLD_PLANS.filter((g) => !g.customCheck).length,
    orderingPassed: scenarioResults.filter(
      (r) => r.passed && !GOLD_PLANS.find((g) => g.id === r.id)?.customCheck
    ).length,
    disclaimer:
      'Regression check, not independent validation. Required orderings use the engine\'s own links and several expected finish days were set from engine output. GS-06 to GS-08 check plates, consent and voice, not task order. Recompute the gold plans from the sources before citing this as ordering correctness.',
    passRate: Math.round((passedCount / GOLD_PLANS.length) * 100),
    scenarioResults,
  };
}

export function evaluateMetric2(): Metric2Result {
  const dict = {
    letterNames: ENGLISH_LETTERS,
    natoAlphabet: NATO_ALPHABET,
    digits: ENGLISH_DIGITS,
    hindiDigits: HINDI_DIGITS,
    teluguDigits: TELUGU_DIGITS,
    kannadaDigits: KANNADA_DIGITS,
    fillerWords: FILLER_WORDS,
  };

  let firstPassCorrect = 0;
  let readBackCorrect = 0;
  const failures: TranscriptFailure[] = [];

  for (const item of TRANSCRIPT_BENCHMARK_SET) {
    const res = parsePlate(item.transcript, dict);

    if (item.expectedPlate === null) {
      // Invalid input should be rejected (success === false or 0 valid candidates)
      const isRejected =
        !res.success ||
        res.candidates.length === 0 ||
        res.candidates.every((c) => !c.isValid || Boolean(c.error));
      if (isRejected) {
        firstPassCorrect++;
        readBackCorrect++;
      } else {
        failures.push({
          id: item.id,
          transcript: item.transcript,
          expectedPlate: null,
          producedPlate: res.candidates[0]?.formatted ?? null,
          category: item.category,
          note: item.note,
        });
      }
      continue;
    }

    const topCandidate = res.candidates[0];
    const topMatches = topCandidate?.formatted === item.expectedPlate;
    const anyMatches = res.candidates.some((c) => c.formatted === item.expectedPlate);

    if (topMatches) {
      firstPassCorrect++;
    }

    if (anyMatches) {
      readBackCorrect++;
    } else {
      failures.push({
        id: item.id,
        transcript: item.transcript,
        expectedPlate: item.expectedPlate,
        producedPlate: topCandidate?.formatted ?? null,
        category: item.category,
        note: item.note,
      });
    }
  }

  const total = TRANSCRIPT_BENCHMARK_SET.length;

  return {
    name: 'Plate Capture Accuracy After Read-Back',
    description:
      'Phonetic and orthographic robustness across NATO, Indic regional digits, multipliers, and look-alikes.',
    totalTranscripts: total,
    firstPassCorrect,
    firstPassAccuracy: Math.round((firstPassCorrect / total) * 1000) / 10,
    readBackCorrect,
    readBackAccuracy: Math.round((readBackCorrect / total) * 1000) / 10,
    wrongFirstReading: total - firstPassCorrect,
    disclaimer:
      'Typed transcripts written alongside the parser, not live audio; live speech accuracy is not measured. (a) is the first reading read back. (b) counts the right plate among the readings offered and assumes the user taps it, so it is an upper bound with no user-error model.',
    failures,
  };
}

export function evaluateMetric3(): Metric3Result {
  const seed = 20260429;
  const sampleSize = 1000;
  const rng = createPRNG(seed);

  const scenarioA = loadScenario('A');
  const packKA = loadMergedRulePack('KA');

  let pravaahLSDCount = 0;
  let pravaahExpiryCount = 0;
  let pravaahSlackSum = 0;

  let naiveLSDCount = 0;
  let naiveExpiryCount = 0;
  let naiveSlackSum = 0;

  // Strategies that separate the effect of picking the online route from scheduling quality.
  const extra = {
    informedOnline: { lsd: 0, expiry: 0, slack: 0 },
    noOnline: { lsd: 0, expiry: 0, slack: 0 },
  };
  const tally = (
    acc: { lsd: number; expiry: number; slack: number },
    plan: ReturnType<typeof planScenario>,
    expiry: number
  ) => {
    const dl = plan.tasks.find((t) => t.id === 'task-licence-renewal' || t.lane === 'licence');
    const start = dl?.start ?? 0;
    const end = dl?.end ?? 0;
    const lsd = dl?.lsd ?? 0;
    acc.slack += lsd - start;
    if (start <= lsd && end <= expiry) acc.lsd++;
    if (end <= expiry) acc.expiry++;
  };

  const histogramBins = [
    { label: 'Missed (< 0)', range: '< 0 days', pravaahCount: 0, naiveCount: 0 },
    { label: 'Tight (0 to 4)', range: '0–4 days', pravaahCount: 0, naiveCount: 0 },
    { label: 'Safe (5 to 14)', range: '5–14 days', pravaahCount: 0, naiveCount: 0 },
    { label: 'Comfortable (15+)', range: '15+ days', pravaahCount: 0, naiveCount: 0 },
  ];

  for (let i = 0; i < sampleSize; i++) {
    const slotQueue = Math.floor(rng() * 37) + 4; // 4 to 40 days
    const licenceExpiry = Math.floor(rng() * 39) + 7; // 7 to 45 days
    const tripStart = Math.floor(rng() * 16) + 5; // 5 to 20
    const tripDuration = Math.floor(rng() * 16) + 5; // 5 to 20

    // Random events
    const events: PlanningEvent[] = [];
    if (rng() > 0.7) events.push({ type: 'formRejected', day: 5 });
    if (rng() > 0.7) events.push({ type: 'tripExtended', additionalDays: Math.floor(rng() * 7) + 3 });
    if (rng() > 0.8) events.push({ type: 'slotCollapse', queueDays: Math.floor(rng() * 15) + 20 });
    if (rng() > 0.8) events.push({ type: 'aadhaarEarly', day: 0 });

    const caseScenario = {
      ...scenarioA,
      primarySlotQueue: slotQueue,
      licenceExpiryDay: licenceExpiry,
      absence: { start: tripStart, end: tripStart + tripDuration },
    };

    // 1. Pravaah Plan (evaluated with option comparison)
    const options = compareOptions({
      scenario: caseScenario,
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'online' },
      events,
    });
    const bestDecision = options[0]?.decisions ?? { form35: 'resolve', licenceRoute: 'online' };
    const pPlan = planScenario({
      scenario: caseScenario,
      mergedPack: packKA,
      decisions: bestDecision,
      events,
    });

    const pDl = pPlan.tasks.find((t) => t.id === 'task-licence-renewal' || t.lane === 'licence');
    const pStart = pDl?.start ?? 0;
    const pEnd = pDl?.end ?? 0;
    const pLSD = pDl?.lsd ?? 0;
    const pSlack = pLSD - pStart;

    pravaahSlackSum += pSlack;

    if (pStart <= pLSD && pEnd <= licenceExpiry) {
      pravaahLSDCount++;
    }
    if (pEnd <= licenceExpiry) {
      pravaahExpiryCount++;
    }

    if (pSlack < 0) histogramBins[0]!.pravaahCount++;
    else if (pSlack <= 4) histogramBins[1]!.pravaahCount++;
    else if (pSlack <= 14) histogramBins[2]!.pravaahCount++;
    else histogramBins[3]!.pravaahCount++;

    // 1b. Informed user who just takes the online route (no option ranking)
    tally(
      extra.informedOnline,
      planScenario({
        scenario: caseScenario,
        mergedPack: packKA,
        decisions: { form35: 'wait', licenceRoute: 'online' },
        events,
      }),
      licenceExpiry
    );

    // 1c. Pravaah when online renewal is not available: best of the in-person options
    const inPerson = options.find((o) => o.decisions.licenceRoute !== 'online');
    tally(
      extra.noOnline,
      planScenario({
        scenario: caseScenario,
        mergedPack: packKA,
        decisions: inPerson?.decisions ?? { form35: 'wait', licenceRoute: 'rto-visit' },
        events,
      }),
      licenceExpiry
    );

    // 2. Naive Baseline Plan (visits RTO for licence, waits for Form 35)
    const nPlan = planScenario({
      scenario: caseScenario,
      mergedPack: packKA,
      decisions: { form35: 'wait', licenceRoute: 'rto-visit' },
      events,
    });

    const nDl = nPlan.tasks.find((t) => t.id === 'task-licence-renewal' || t.lane === 'licence');
    const nStart = nDl?.start ?? 0;
    const nEnd = nDl?.end ?? 0;
    const nLSD = nDl?.lsd ?? 0;
    const nSlack = nLSD - nStart;

    naiveSlackSum += nSlack;

    if (nStart <= nLSD && nEnd <= licenceExpiry) {
      naiveLSDCount++;
    }
    if (nEnd <= licenceExpiry) {
      naiveExpiryCount++;
    }

    if (nSlack < 0) histogramBins[0]!.naiveCount++;
    else if (nSlack <= 4) histogramBins[1]!.naiveCount++;
    else if (nSlack <= 14) histogramBins[2]!.naiveCount++;
    else histogramBins[3]!.naiveCount++;
  }

  const histogram: HistogramBin[] = histogramBins.map((bin) => ({
    label: bin.label,
    range: bin.range,
    pravaahCount: bin.pravaahCount,
    naiveCount: bin.naiveCount,
    pravaahPercent: Math.round((bin.pravaahCount / sampleSize) * 1000) / 10,
    naivePercent: Math.round((bin.naiveCount / sampleSize) * 1000) / 10,
  }));

  return {
    name: 'Renewals Under Scarce Slots',
    description:
      'Seeded simulation of 1,000 randomized timelines. The naive baseline always books the RTO slot, so most of its gap to Pravaah is the online route; the extra rows separate that out.',
    assumptions: [
      'Online renewal is assumed available with an assumed 5-day processing time (Karnataka pack flag, unverified).',
      'Slot queues, trips, expiry days and disruptions are drawn from the stated ranges with a fixed seed.',
      'Limits are Pravaah\'s own latest safe dates, so this measures plans against the engine\'s model, not real RTOs.',
    ],
    additional: [
      {
        label: 'Informed user: online route, wait for Form 35',
        note: 'No option ranking. Shows what route choice alone gives.',
        completedBeforeLSDPercent: Math.round((extra.informedOnline.lsd / sampleSize) * 1000) / 10,
        renewedBeforeExpiryPercent: Math.round((extra.informedOnline.expiry / sampleSize) * 1000) / 10,
        avgSlackDays: Math.round((extra.informedOnline.slack / sampleSize) * 10) / 10,
      },
      {
        label: 'Pravaah when online renewal is unavailable',
        note: 'Best in-person option only. Shows scheduling quality without the online route.',
        completedBeforeLSDPercent: Math.round((extra.noOnline.lsd / sampleSize) * 1000) / 10,
        renewedBeforeExpiryPercent: Math.round((extra.noOnline.expiry / sampleSize) * 1000) / 10,
        avgSlackDays: Math.round((extra.noOnline.slack / sampleSize) * 10) / 10,
      },
    ],
    seed,
    sampleSize,
    parameterRanges: {
      slotQueueDays: '4 to 40 days',
      licenceExpiryDays: '7 to 45 days',
      tripDurationDays: '5 to 20 days',
      disruptionsModelled: 'Form 35 rejection, Trip extension, Slot collapse, Early Aadhaar',
    },
    pravaah: {
      completedBeforeLSDPercent: Math.round((pravaahLSDCount / sampleSize) * 1000) / 10,
      renewedBeforeExpiryPercent: Math.round((pravaahExpiryCount / sampleSize) * 1000) / 10,
      avgSlackDays: Math.round((pravaahSlackSum / sampleSize) * 10) / 10,
    },
    naiveBaseline: {
      completedBeforeLSDPercent: Math.round((naiveLSDCount / sampleSize) * 1000) / 10,
      renewedBeforeExpiryPercent: Math.round((naiveExpiryCount / sampleSize) * 1000) / 10,
      avgSlackDays: Math.round((naiveSlackSum / sampleSize) * 10) / 10,
    },
    histogram,
  };
}

export function calculateAllMetrics(
  onProgress?: (step: number, total: number, label: string) => void
): AllMetricsReport {
  onProgress?.(1, 3, `Evaluating ${GOLD_PLANS.length} gold scenarios...`);
  const metric1 = evaluateMetric1();

  onProgress?.(2, 3, 'Running plate capture accuracy on 87 typed transcripts...');
  const metric2 = evaluateMetric2();

  onProgress?.(3, 3, 'Simulating 1,000 scarce-slot cases against naive baseline...');
  const metric3 = evaluateMetric3();

  return {
    timestamp: new Date().toISOString(),
    engineVersion: '0.2.0',
    metric1,
    metric2,
    metric3,
  };
}
