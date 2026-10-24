import { describe, it, expect } from 'vitest';
import {
  planScenario,
  type Scenario,
  type RulePack,
  type Decisions,
  type PlanningEvent,
  type Form35Decision,
  type LicenceRouteDecision,
} from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

// Seeded PRNG (Mulberry32) for deterministic reproducible testing
function mulberry32(seed: number) {
  let state = seed;
  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Engine: Core Planning Invariants (500+ Seeded Runs)', () => {
  const baseScenario: Scenario = loadScenario('A');
  const basePack: RulePack = loadMergedRulePack('KA');

  it('strictly satisfies all 5 core invariants across 500 random parameter combinations', () => {
    const rng = mulberry32(20260224); // Fixed seed

    const form35Choices: Form35Decision[] = ['resolve', 'withdraw', 'wait'];
    const licenceRouteChoices: LicenceRouteDecision[] = [
      'online',
      'rto-visit',
      'another-rto',
      'another-date',
    ];

    const TOTAL_RUNS = 500;

    for (let run = 0; run < TOTAL_RUNS; run++) {
      const slotQueue = Math.floor(rng() * 46); // 0 to 45
      const licenceExpiry = Math.floor(rng() * 61); // 0 to 60
      const tripStart = Math.floor(rng() * 30);
      const tripLength = Math.floor(rng() * 15) + 1;
      const tripEnd = tripStart + tripLength;

      const f35 = form35Choices[Math.floor(rng() * form35Choices.length)]!;
      const lr = licenceRouteChoices[Math.floor(rng() * licenceRouteChoices.length)]!;
      const isBH = rng() < 0.2;
      const isDegraded = rng() < 0.15;

      const events: PlanningEvent[] = [];
      if (rng() < 0.2) events.push({ type: 'formRejected', day: 5 });
      if (rng() < 0.2) events.push({ type: 'aadhaarEarly', day: 0 });
      if (rng() < 0.2) events.push({ type: 'tripExtended', additionalDays: 7 });
      if (rng() < 0.2) events.push({ type: 'slotCollapse', queueDays: 28 });

      const scenario: Scenario = {
        ...baseScenario,
        primarySlotQueue: slotQueue,
        licenceExpiryDay: licenceExpiry,
        absence: { start: tripStart, end: tripEnd },
        move: {
          ...baseScenario.move,
          isBHSeries: isBH,
          toState: isDegraded ? 'SK' : 'KA',
        },
      };

      const pack: RulePack = isDegraded ? loadMergedRulePack('SK') : basePack;
      const decisions: Decisions = {
        form35: f35,
        licenceRoute: lr,
        alternativeRTO: 'KA-01',
      };

      const planA = planScenario({ scenario, mergedPack: pack, decisions, events });
      const planB = planScenario({ scenario, mergedPack: pack, decisions, events });

      // Invariant 4: Determinism (identical input -> identical output)
      expect(planA.finish).toBe(planB.finish);
      expect(planA.finishingTask).toBe(planB.finishingTask);
      expect(planA.tasks.length).toBe(planB.tasks.length);

      const taskMap = new Map(planA.tasks.map((t) => [t.id, t]));

      // Invariant 1: No task starts before all its hard dependencies end
      for (const link of planA.links) {
        if (
          link.type === 'needs' ||
          link.type === 'unlocks' ||
          link.type === 'reuses' ||
          link.type === 'propagates'
        ) {
          const fromTask = taskMap.get(link.from);
          const toTask = taskMap.get(link.to);

          if (fromTask && toTask && !fromTask.unknown && !toTask.unknown) {
            expect(toTask.start).toBeGreaterThanOrEqual(fromTask.end);
          }
        }
      }

      // Invariant 2: No in-person task starts before first slot or inside absence window
      const effectiveAbsenceStart = scenario.absence.start;
      const tripExt = events.find((e) => e.type === 'tripExtended');
      const effectiveAbsenceEnd =
        scenario.absence.end + (tripExt ? (tripExt.additionalDays ?? 7) : 0);

      const effectiveSlot = events.find((e) => e.type === 'slotCollapse') ? 28 : slotQueue;

      for (const task of planA.tasks) {
        if (task.inPerson && !task.unknown) {
          let taskSlot = effectiveSlot;
          if (task.id === 'task-licence-renewal' && decisions.licenceRoute === 'another-rto') {
            taskSlot = scenario.alternativeSlots?.[0]?.queueDays ?? taskSlot;
          }

          expect(task.start).toBeGreaterThanOrEqual(taskSlot);

          const insideAbsence =
            task.start >= effectiveAbsenceStart && task.start < effectiveAbsenceEnd;
          expect(insideAbsence).toBe(false);
        }
      }

      // Invariant 3: Finish = max end over all known tasks, and finishingTask matches it
      const knownTasks = planA.tasks.filter((t) => !t.unknown);
      if (knownTasks.length > 0) {
        const computedMaxEnd = Math.max(...knownTasks.map((t) => t.end));
        expect(planA.finish).toBe(computedMaxEnd);

        const finishingTask = taskMap.get(planA.finishingTask);
        expect(finishingTask).toBeDefined();
        expect(finishingTask?.end).toBe(planA.finish);
      }

      // Invariant 5: Unknown tasks never carry a date or fee amount
      for (const task of planA.tasks) {
        if (task.unknown) {
          expect(task.duration).toBe(0);
          expect(task.status).toBe('Unknown');
        }
      }

      for (const fee of planA.fees.items) {
        if (fee.tag === 'Hidden') {
          expect(fee.amount).toBeNull();
        }
      }
    }
  });
});
