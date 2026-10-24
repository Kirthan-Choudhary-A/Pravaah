/**
 * 11-Step Interactive Guided Demo Walkthrough for Judges
 */

export interface DemoStep {
  readonly stepNumber: number;
  readonly title: string;
  readonly path: string;
  readonly narration: string;
  readonly keyTakeaway: string;
}

export const DEMO_STEPS: readonly DemoStep[] = [
  {
    stepNumber: 1,
    title: 'The Problem in One Line',
    path: '/',
    narration:
      'Transport compliance in India is fragmented across isolated portals (Sarathi, Vahan, State RTOs). Pravaah unifies driving licences, personal vehicles, and family fleets into one ordered schedule.',
    keyTakeaway: 'One unified timeline with zero guesswork.',
  },
  {
    stepNumber: 2,
    title: 'Master Plan (Scenario A)',
    path: '/plan?scenario=A',
    narration:
      'For a relocation from Telangana to Karnataka, Pravaah schedules 13 tasks finishing on Day 31 with licence renewal Safe on Day 5. Inspect the NOC task: every single dependency is backed by an explicit statutory section.',
    keyTakeaway: 'Every dependency is grounded in CMVR and MV Act rules.',
  },
  {
    stepNumber: 3,
    title: 'Latest Safe Date (LSD)',
    path: '/plan?scenario=A&compare=1',
    narration:
      'Working backwards from licence expiry on Day 16, an in-person RTO visit is computed as Missed due to slot wait times, while online Aadhaar e-KYC renewal is Safe with 11 days of buffer.',
    keyTakeaway: 'Causal backward pass calculates latest safe date without guessing.',
  },
  {
    stepNumber: 4,
    title: 'Disruption: Form 35 Rejected',
    path: '/simulate?scenario=A&formRejected=1',
    narration:
      'Simulate an unexpected bank loan hypothecation rejection. The before/after diff immediately identifies two newly required tasks (Bank Consent Form 28 and New RC Loan Closure), adjusting the finish to Day 39.',
    keyTakeaway: 'Instant graph recalculation with clear task diffs.',
  },
  {
    stepNumber: 5,
    title: 'Disruption: Slots Collapse to 28 Days',
    path: '/simulate?scenario=A&slotCollapse=28',
    narration:
      'When appointment queues collapse under sudden seasonal surge, the in-person route LSD drops to Day -19 and Pravaah automatically switches its top recommendation to online renewal.',
    keyTakeaway: 'Dynamic option comparison under scarce capacity.',
  },
  {
    stepNumber: 6,
    title: 'The Address-Proof Trap',
    path: '/simulate?scenario=A&aadhaarEarly=1',
    narration:
      'Updating your Aadhaar address prior to obtaining NOC triggers Section 49 invalidation: the invalidates link fires, the compliance check fails, and the schedule adds 9 days of rework delay.',
    keyTakeaway: 'Protects citizens against silent cascading invalidations.',
  },
  {
    stepNumber: 7,
    title: 'Degraded Mode in Unknown Jurisdictions',
    path: '/simulate?scenario=C',
    narration:
      'For moves to unmodelled states like Sikkim, Pravaah enters degraded mode. Known central steps are scheduled normally, while state rules remain Unknown with zero invented fees.',
    keyTakeaway: 'Strict epistemic honesty: never invents unknown state fees.',
  },
  {
    stepNumber: 8,
    title: 'Phonetic Voice Plate Entry',
    path: '/voice?sample=dl-class',
    narration:
      'Transcribing noisy input "dee el one see..." detects Delhi Car series letter ("C") on a two-wheeler, returning an interactive clarification question rather than silently auto-mutating citizen records.',
    keyTakeaway: 'Positional look-alike fixes with zero silent guesses.',
  },
  {
    stepNumber: 9,
    title: 'Privacy-by-Design Household Sharing',
    path: '/household',
    narration:
      'Family records stay masked by default. Granting time-bounded "view" consent adds the vehicle to your timeline while keeping owner identity documents strictly private. Every single reveal is permanently audited.',
    keyTakeaway: 'Zero-knowledge family delegation with immutable audit trails.',
  },
  {
    stepNumber: 10,
    title: 'Challenge Metrics Evaluation',
    path: '/metrics',
    narration:
      'Inspect reproducible benchmarks: 100% dependency correctness on gold plans, 95.4% voice plate capture accuracy after read-back, and 96.1% renewals completed before LSD across 1,000 randomized cases.',
    keyTakeaway: 'Every metric provides reproducible method, seed, and data table.',
  },
  {
    stepNumber: 11,
    title: 'Open Statutory Citations',
    path: '/sources',
    narration:
      'Review official legal citations from India Code, CMVR notifications, and state transport departments. Unverified state rule overrides are prominently flagged awaiting manual review.',
    keyTakeaway: 'Every rule is traceable to official gazettes.',
  },
];
