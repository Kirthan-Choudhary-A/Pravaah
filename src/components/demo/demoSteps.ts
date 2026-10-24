/**
 * 11-Step Interactive Guided Demo Walkthrough for Judges.
 * Every number comes from the engine and the simulated scenario, so the guide cannot drift
 * from what the app shows. Metric results are not repeated here: /metrics shows them with
 * their method and assumptions.
 */

import { loadScenario, loadMergedRulePack } from '@data';
import { compareOptions, planScenario } from '@engine';
import type { Decisions, PlanResult, PlanningEvent } from '@engine';

export interface DemoStep {
  readonly stepNumber: number;
  readonly title: string;
  readonly path: string;
  readonly narration: string;
  readonly keyTakeaway: string;
}

function buildDemoSteps(): readonly DemoStep[] {
  const scenarioA = loadScenario('A');
  const packKA = loadMergedRulePack('KA');
  const online: Decisions = { form35: 'resolve', licenceRoute: 'online' };
  const inPerson: Decisions = { form35: 'resolve', licenceRoute: 'rto-visit' };

  const plan = (decisions: Decisions, events: PlanningEvent[] = []): PlanResult =>
    planScenario({ scenario: scenarioA, mergedPack: packKA, decisions, events });
  const renewal = (p: PlanResult) => p.tasks.find((t) => t.id === 'task-licence-renewal')!;

  const base = plan(online);
  const baseRenewal = renewal(base);
  const visitRenewal = renewal(plan(inPerson));
  const rejected = plan(online, [{ type: 'formRejected', day: 5 }]);
  const baseIds = new Set(base.tasks.map((t) => t.id));
  const addedByRejection = rejected.tasks.filter((t) => !baseIds.has(t.id)).length;
  const slotEvent: PlanningEvent[] = [{ type: 'slotCollapse', queueDays: 28 }];
  const collapsedVisit = renewal(plan(inPerson, slotEvent));
  const collapsedBest = compareOptions({
    scenario: scenarioA,
    mergedPack: packKA,
    decisions: online,
    events: slotEvent,
  })[0]!;
  const early = plan(online, [{ type: 'aadhaarEarly', day: 0 }]);
  const expiry = scenarioA.licenceExpiryDay;

  return [
    {
      stepNumber: 1,
      title: 'The Problem in One Line',
      path: '/',
      narration:
        'Vehicle and licence services are split across Sarathi, Vahan and each state RTO. Pravaah puts a licence, vehicles and household vehicles into one ordered schedule, using simulated data.',
      keyTakeaway: 'One unified timeline; unknowns are labelled, not guessed.',
    },
    {
      stepNumber: 2,
      title: 'Master Plan (Scenario A)',
      path: '/plan?scenario=A',
      narration: `For the simulated move from Telangana to Karnataka, Pravaah schedules ${base.tasks.length} tasks finishing on Day ${base.finish}, with the licence renewal ending on Day ${baseRenewal.end} (${baseRenewal.status}). Open any task to see each dependency's reason, basis and sources. Every one is marked unverified.`,
      keyTakeaway: 'Every dependency has a stated reason and basis.',
    },
    {
      stepNumber: 3,
      title: 'Latest Safe Date (LSD)',
      path: '/plan?scenario=A&compare=1',
      narration: `Working backwards from licence expiry on Day ${expiry}, renewing at the RTO is ${visitRenewal.status} (it ends on Day ${visitRenewal.end}) because of the slot queue and the owner's trip, while online Aadhaar renewal is ${baseRenewal.status} with a latest safe start of Day ${baseRenewal.lsd}. Processing times are assumed.`,
      keyTakeaway: 'A backward pass gives each task its latest safe date.',
    },
    {
      stepNumber: 4,
      title: 'Disruption: Form 35 Rejected',
      path: '/simulate?scenario=A&formRejected=1',
      narration: `Simulate a rejected Form 35. The before and after comparison shows ${addedByRejection} newly required tasks (bank consent on Form 28 and loan closure on the new RC) and moves the finish from Day ${base.finish} to Day ${rejected.finish}.`,
      keyTakeaway: 'Instant graph recalculation with clear task differences.',
    },
    {
      stepNumber: 5,
      title: 'Disruption: Slots Collapse to 28 Days',
      path: '/simulate?scenario=A&slotCollapse=28',
      narration: `When the appointment queue grows to 28 days, the latest safe date of the in-person route falls to Day ${collapsedVisit.lsd} and the top-ranked option becomes the ${collapsedBest.decisions.licenceRoute} route, which keeps the licence from lapsing. Online renewal is assumed to be available.`,
      keyTakeaway: 'Option ranking puts a lapsing licence last.',
    },
    {
      stepNumber: 6,
      title: 'The Address-Proof Trap',
      path: '/simulate?scenario=A&aadhaarEarly=1',
      narration: `In the modelled rules, updating Aadhaar before the NOC is issued invalidates the NOC. The invalidates link fires, the check fails, and the finish moves from Day ${base.finish} to Day ${early.finish}. This is an assumed rule, not confirmed law.`,
      keyTakeaway: 'A modelled trap is shown with its cost, and labelled as modelled.',
    },
    {
      stepNumber: 7,
      title: 'Degraded Mode in Unknown Jurisdictions',
      path: '/simulate?scenario=C',
      narration:
        'For a move to a state with no rule pack, such as Sikkim, Pravaah enters degraded mode. Steps that depend on that state are marked unknown, their fees are hidden, and official links are shown.',
      keyTakeaway: 'Unknown rules are shown as unknown; no fees or dates are invented.',
    },
    {
      stepNumber: 8,
      title: 'Phonetic Voice Plate Entry',
      path: '/voice?sample=dl-class',
      narration:
        'The transcript "dee el one see…" gives a Delhi plate with class letter C on a vehicle chosen as a two-wheeler. Pravaah asks which is right instead of changing the record, and blocks saving until you answer. Other possible readings are offered when a plate is ambiguous.',
      keyTakeaway: 'Look-alike fixes are shown, and a class mismatch is asked, not auto-corrected.',
    },
    {
      stepNumber: 9,
      title: 'Privacy-by-Design Household Sharing',
      path: '/household',
      narration:
        'Family records stay masked by default. A consent with a scope and an end date adds the family vehicle to your timeline, while the owner\'s Aadhaar, licence and challans are never shown to you. Each reveal needs a stated purpose and is logged in a simulated, browser-only audit log.',
      keyTakeaway: 'Consent is per vehicle with an end date; reveals are purposeful and logged.',
    },
    {
      stepNumber: 10,
      title: 'Challenge Metrics Evaluation',
      path: '/metrics',
      narration:
        'The metrics page shows the three measures from the brief with their method, seed and assumptions. Read the notes on each: the gold plans are a regression check, the plate set is typed text, and the scarcity run assumes online renewal is available.',
      keyTakeaway: 'Each number comes with its method and its limits.',
    },
    {
      stepNumber: 11,
      title: 'Sources and Verification Status',
      path: '/sources',
      narration:
        'The registry lists the official places to read each rule and fee. Every entry is currently marked unverified, because nobody has yet read the official text.',
      keyTakeaway: 'Rules are traceable to a named source, and none is verified yet.',
    },
  ];
}

export const DEMO_STEPS: readonly DemoStep[] = buildDemoSteps();
