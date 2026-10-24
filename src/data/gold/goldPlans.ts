/**
 * Gold Plan Specifications for Metric 1: Dependency-Ordering Correctness
 * Evaluates the gold scenarios against modelled rules, causal DAG constraints,
 * and degraded/unknown boundaries.
 *
 * Expected finish days are hand-derived from src/data/assumptions/timings.json (see each
 * `derivation`), not copied from engine output. Owner away days are inclusive in the project
 * document (days 12-25), so the owner is back on day 26.
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
  /** Hand arithmetic behind expectedFinishDay, from the assumed timings. */
  readonly derivation?: string;
}

export const GOLD_PLANS: readonly GoldPlanSpec[] = [
  {
    id: 'GS-01',
    name: 'Scenario A Best Plan',
    description:
      'Standard interstate move (KA) finishes on day 31 with every modelled dependency respected.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    expectedFinishDay: 31,
    derivation:
      'Form 35 resolve 0-9, challan 0-1, NOC 9-19, Aadhaar update 19-26, licence address change 26-31. Registration visit 26-30 (owner back on 26).',
    expectedFinishingTask: 'task-licence-address-change',
    requiredOrderings: [
      {
        before: 'task-pay-echallan',
        after: 'task-noc-form28',
        reason: 'Modelled rule (assumed): unpaid dues hold the NOC until they are cleared',
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
    derivation:
      'Early Aadhaar invalidates the NOC: NOC 9-19 plus 17 days of rework ends 36, registration visit 36-40.',
    expectedFailedChecks: ['check-aadhaar-after-noc'],
  },
  {
    id: 'GS-03',
    name: 'Scenario A Slot Queue Collapse (in-person route)',
    description:
      'With the slot queue at 28 days the in-person licence renewal happens on day 28, after the day-21 expiry.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'rto-visit' },
    events: [{ type: 'slotCollapse', queueDays: 28 }],
    expectedFinishDay: 36,
    derivation:
      'Licence renewal at the RTO 28-31 (after expiry), licence address change 31-36. Registration visit 28-32.',
  },
  {
    id: 'GS-04',
    name: 'Scenario A Form 35 Rejection',
    description:
      'Form 35 rejection requires bank consent on Form 28 and loan closure on the new RC; finish moves to day 40.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    events: [{ type: 'formRejected', day: 5 }],
    expectedFinishDay: 40,
    derivation:
      'Rejection 0-5, bank consent 5-12, NOC 12-22, registration visit 26-30 (owner back on 26), loan closure on the new RC 30-40.',
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
      'Granular consent masking, no unauthorized field reveal, and an audit trail (simulated, not tamper-evident).',
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
      'BH series is modelled as exempt from NOC and re-registration (notification unverified); finish on day 12.',
    scenarioId: 'B',
    stateCode: 'TN',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    expectedFinishDay: 12,
    derivation: 'Aadhaar update 0-7, licence address change 7-12. Rental agreement 0-3 and RC intimation 3-6 run in parallel.',
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
      'Owner trip extended by 7 days (away through day 32) pushes the registration visit to day 33 and the finish to day 37.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    events: [{ type: 'tripExtended', additionalDays: 7 }],
    expectedFinishDay: 37,
    derivation: 'Registration visit 33-37 once the owner is back on day 33.',
  },
  {
    id: 'GS-11',
    name: 'Scenario A Section 49 Address Intimation',
    description:
      'Modelled 30-day limit (Section 49, unverified) for RC address intimation: duration 3, LSD 25, status Safe.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
  },
  {
    id: 'GS-12',
    name: 'Scenario A Slot Queue Collapse (online route)',
    description:
      'With the slot queue at 28 days the plan renews the licence online instead; finish on day 32 and the licence is renewed by day 5.',
    scenarioId: 'A',
    stateCode: 'KA',
    decisions: { form35: 'resolve', licenceRoute: 'online' },
    events: [{ type: 'slotCollapse', queueDays: 28 }],
    expectedFinishDay: 32,
    expectedFinishingTask: 'task-re-registration-form27',
    derivation: 'Licence renewal online 0-5. Registration visit at the first slot, day 28, 28-32.',
  },
];
