/**
 * Gold Plan Specifications for Metric 1: Dependency-Ordering Correctness
 * Evaluates GS-01 through GS-11 against statutory rules, causal DAG constraints,
 * and degraded/unknown boundaries.
 */

import type { PlanningEvent, Decisions } from '@engine';

export interface RequiredOrdering {
  readonly before: string;
  readonly after: string;
  readonly reason: string;
}

export interface ForbiddenOrdering {
  readonly before: string;
  readonly after: string;
  readonly reason: string;
}

export interface GoldPlanSpec {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly scenarioId: 'A' | 'B' | 'C';
  readonly stateCode: string;
  readonly decisions: Decisions;
  readonly events?: readonly PlanningEvent[];
  readonly requiredOrderings?: readonly RequiredOrdering[];
  readonly forbiddenOrderings?: readonly ForbiddenOrdering[];
  readonly expectedFinishingTask?: string;
  readonly expectedFinishDay?: number;
  readonly expectedDegraded?: boolean;
  readonly expectedUnknownTasks?: readonly string[];
  readonly expectedFailedChecks?: readonly string[];
  readonly expectedAddedTasks?: readonly string[];
  readonly expectedExcludedTasks?: readonly string[];
  readonly customCheck?: 'GS-06' | 'GS-07' | 'GS-08';
}

export const GOLD_PLANS: readonly GoldPlanSpec[] = [
  {
    id: 'GS-01',
    name: 'Scenario A Best Plan',
    description:
      'Standard interstate move (KA) finishes in 31 days with all statutory dependencies respected.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    expectedFinishDay: 31,
    expectedFinishingTask: 'task-licence-address-change',
    requiredOrderings: [
      {
        before: 'task-pay-echallan',
        after: 'task-noc-form28',
        reason: 'Challan clearance is required before NOC Form 28 issuance under CMVR Rule 58',
      },
      {
        before: 'task-noc-form28',
        after: 'task-aadhaar-update',
        reason: 'NOC application must precede Aadhaar address change to avoid state mismatch',
      },
      {
        before: 'task-aadhaar-update',
        after: 'task-licence-address-change',
        reason: 'DL address change requires updated Aadhaar proof',
      },
    ],
    forbiddenOrderings: [
      {
        before: 'task-aadhaar-update',
        after: 'task-noc-form28',
        reason: 'Aadhaar update must not precede NOC; doing so invalidates NOC eligibility',
      },
    ],
  },
  {
    id: 'GS-02',
    name: 'Scenario A Early Aadhaar Invalidation',
    description:
      'Aadhaar updated early triggers invalidates link to NOC, delays finish to Day 40, and flags compliance check.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    events: [{ type: 'aadhaarEarly', day: 0 }],
    expectedFinishDay: 40,
    expectedFailedChecks: ['check-aadhaar-after-noc'],
  },
  {
    id: 'GS-03',
    name: 'Scenario A Slot Queue Collapse',
    description:
      'RTO slot queue expanding to 28 days makes in-person route Missed; engine recommends online renewal.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'rto-visit' },
    events: [{ type: 'slotCollapse', queueDays: 28 }],
  },
  {
    id: 'GS-04',
    name: 'Scenario A Form 35 Rejection',
    description:
      'Bank rejection requires bank consent Form 28 and new RC loan closure, adding 8 days of delay.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    events: [{ type: 'formRejected', day: 5 }],
    expectedFinishDay: 39,
    expectedAddedTasks: ['task-bank-consent-form28', 'task-close-loan-new-rc'],
  },
  {
    id: 'GS-05',
    name: 'Scenario C Degraded Mode (Sikkim)',
    description:
      'Unknown state jurisdiction enters degraded mode: unknown tasks duration 0, hidden fee tags, no invented dates.',
    scenarioId: 'C',
    stateCode: 'SK',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    expectedDegraded: true,
    expectedUnknownTasks: ['task-re-registration-form27'],
  },
  {
    id: 'GS-06',
    name: 'Delhi Plate Class Mismatch',
    description:
      'Car registration letter "C" on two-wheeler triggers conversational clarification without silent mutation.',
    scenarioId: 'A',
    stateCode: 'DL',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    customCheck: 'GS-06',
  },
  {
    id: 'GS-07',
    name: 'Household Consent & Privacy Lifecycle',
    description:
      'Granular consent masking, zero unauthorized field reveal, and immutable audit trail.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    customCheck: 'GS-07',
  },
  {
    id: 'GS-08',
    name: 'Voice Plate Entry & Multilingual Read-Back',
    description:
      'Phonetic transcript look-alike correction (O->0 in RTO code), regional read-back, confirmed save.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    customCheck: 'GS-08',
  },
  {
    id: 'GS-09',
    name: 'Scenario B BH-Series Exemption',
    description:
      'BH series exempt from NOC and re-registration under MoRTH Notification GSR 594(E); finish in 12 days.',
    scenarioId: 'B',
    stateCode: 'TN',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    expectedFinishDay: 12,
    expectedExcludedTasks: [
      'task-noc-form28',
      'task-re-registration-form27',
      'task-form35-action',
    ],
  },
  {
    id: 'GS-10',
    name: 'Scenario A Trip Extension',
    description:
      'Owner trip extended by 7 days pushes in-person RTO inspection to Day 32 with finish on Day 36.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    events: [{ type: 'tripExtended', additionalDays: 7 }],
    expectedFinishDay: 36,
  },
  {
    id: 'GS-11',
    name: 'Scenario A Section 49 Address Intimation',
    description:
      'Statutory 30-day mandate for RC address change scheduled with duration 3, LSD 25, status Safe.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
  },
];
