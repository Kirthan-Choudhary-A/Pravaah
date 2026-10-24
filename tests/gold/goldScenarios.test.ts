import { describe, it, expect } from 'vitest';
import {
  planScenario,
  diffPlans,
  compareOptions,
  type Scenario,
  type RulePack,
  type Decisions,
} from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

describe('Gold Scenario Test Suite (GS-01 to GS-11)', () => {
  const scenarioA: Scenario = loadScenario('A');
  const scenarioB: Scenario = loadScenario('B');
  const scenarioC: Scenario = loadScenario('C');

  const packKA: RulePack = loadMergedRulePack('KA');
  const packTN: RulePack = loadMergedRulePack('TN');
  const packSK: RulePack = loadMergedRulePack('SK');

  const bestDecisionsA: Decisions = { form35: 'resolve', licenceRoute: 'online' };

  // GS-01: Scenario A, Best Plan
  it('GS-01: Scenario A best plan finishes on Day 31 with licence renewed online and all checks passing', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
    });

    expect(plan.finish).toBe(31);
    expect(plan.finishingTask).toBe('task-licence-address-change');

    const dl = plan.tasks.find((t) => t.id === 'task-licence-renewal')!;
    expect(dl.end).toBe(5);
    expect(dl.end).toBeLessThanOrEqual(scenarioA.licenceExpiryDay);

    const noc = plan.tasks.find((t) => t.id === 'task-noc-form28')!;
    const aadhaar = plan.tasks.find((t) => t.id === 'task-aadhaar-update')!;
    expect(aadhaar.start).toBeGreaterThanOrEqual(noc.end);

    const reReg = plan.tasks.find((t) => t.id === 'task-re-registration-form27')!;
    expect(reReg.start).toBe(25); // exactly after owner returns on day 25

    for (const c of plan.checks) {
      expect(c.passed).toBe(true);
    }
  });

  // GS-02: Scenario A + aadhaarEarly
  it('GS-02: Scenario A + aadhaarEarly triggers invalidates link, reworks NOC, and fails check', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
      events: [{ type: 'aadhaarEarly', day: 0 }],
    });

    const invLink = plan.links.find((l) => l.type === 'invalidates')!;
    expect(invLink).toBeDefined();
    expect(invLink.from).toBe('task-aadhaar-update');
    expect(invLink.to).toBe('task-noc-form28');

    const aadhaarCheck = plan.checks.find((c) => c.id === 'check-aadhaar-after-noc')!;
    expect(aadhaarCheck.passed).toBe(false);

    // Plan finishes later (Day 40) due to NOC rework delay
    expect(plan.finish).toBe(40);
  });

  // GS-03: Scenario A with slot queue 4 vs slotCollapse to 28
  it('GS-03: Slot queue 4 vs slotCollapse to 28 changes RTO route to Missed and changes recommendation', () => {
    const planSlot4 = planScenario({
      scenario: { ...scenarioA, primarySlotQueue: 4 },
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'rto-visit' },
    });

    const dlSlot4 = planSlot4.tasks.find((t) => t.id === 'task-licence-renewal')!;
    expect(dlSlot4.start).toBe(4);
    expect(dlSlot4.status).toBe('Safe');

    const planSlot28 = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'rto-visit' },
      events: [{ type: 'slotCollapse', queueDays: 28 }],
    });

    const dlSlot28 = planSlot28.tasks.find((t) => t.id === 'task-licence-renewal')!;
    expect(dlSlot28.status).toBe('Missed');
    expect(dlSlot28.bookingLSD).toBe(-19);

    const comp = compareOptions({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'rto-visit' },
      events: [{ type: 'slotCollapse', queueDays: 28 }],
    });

    // Best recommendation is online renewal, not RTO visit
    expect(comp[0]!.decisions.licenceRoute).toBe('online');
  });

  // GS-04: Scenario A + formRejected
  it('GS-04: Scenario A + formRejected adds bank consent and new RC loan closure', () => {
    const beforePlan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
    });

    const afterPlan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
      events: [{ type: 'formRejected', day: 5 }],
    });

    const diff = diffPlans(beforePlan, afterPlan);
    expect(diff.tasksAdded).toContain('task-bank-consent-form28');
    expect(diff.tasksAdded).toContain('task-close-loan-new-rc');

    const taskMap = new Map(afterPlan.tasks.map((t) => [t.id, t]));
    expect(taskMap.has('task-bank-consent-form28')).toBe(true);
    expect(taskMap.has('task-close-loan-new-rc')).toBe(true);

    expect(afterPlan.finish).toBe(39);
  });

  // GS-05: Scenario C (Unknown Sikkim jurisdiction)
  it('GS-05: Scenario C has unknown Sikkim tasks, Hidden fees, no invented dates, and known steps scheduled', () => {
    const plan = planScenario({
      scenario: scenarioC,
      mergedPack: packSK,
      decisions: bestDecisionsA,
    });

    expect(plan.degradedMode).toBe(true);

    const skTask = plan.tasks.find((t) => t.id === 'task-re-registration-form27')!;
    expect(skTask.unknown).toBe(true);
    expect(skTask.duration).toBe(0);
    expect(skTask.status).toBe('Unknown');

    const hiddenFee = plan.fees.items.find((f) => f.tag === 'Hidden')!;
    expect(hiddenFee.amount).toBeNull();

    // Known steps still get valid schedules
    const challan = plan.tasks.find((t) => t.id === 'task-pay-echallan')!;
    expect(challan.start).toBe(0);
    expect(challan.end).toBe(1);

    const noc = plan.tasks.find((t) => t.id === 'task-noc-form28')!;
    expect(noc.start).toBe(1);
    expect(noc.end).toBe(11); // 1 + 10 = Day 11 ready
  });

  // GS-09: Scenario B (BH Series)
  it('GS-09: Scenario B handles BH-series vehicle with address updates only (no NOC, no re-registration)', () => {
    const plan = planScenario({
      scenario: scenarioB,
      mergedPack: packTN,
      decisions: bestDecisionsA,
    });

    const taskIds = plan.tasks.map((t) => t.id);
    expect(taskIds).not.toContain('task-noc-form28');
    expect(taskIds).not.toContain('task-re-registration-form27');
    expect(taskIds).not.toContain('task-form35-action');

    expect(taskIds).toContain('task-aadhaar-update');
    expect(taskIds).toContain('task-licence-address-change');
    expect(taskIds).toContain('task-rc-address-intimation');

    expect(plan.finish).toBe(12);
  });

  // GS-10: Scenario A + tripExtended(7)
  it('GS-10: Scenario A + tripExtended(7) schedules in-person visit when owner is back in town', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
      events: [{ type: 'tripExtended', additionalDays: 7 }],
    });

    // Original trip days 12-25 + 7 = 12-32.
    // Visit starts on Day 32 + 4 days duration = Day 36
    const reReg = plan.tasks.find((t) => t.id === 'task-re-registration-form27')!;
    expect(reReg.start).toBe(32);
    expect(reReg.end).toBe(36);

    const inTownCheck = plan.checks.find((c) => c.id === 'check-owner-in-town')!;
    expect(inTownCheck.passed).toBe(true);
  });

  // GS-11: Scenario A Section 49 RC address intimation
  it('GS-11: Scenario A RC address intimation shows deadline, LSD, and Safe status', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: bestDecisionsA,
    });

    const rcTask = plan.tasks.find((t) => t.id === 'task-rc-address-intimation')!;
    expect(rcTask).toBeDefined();
    expect(rcTask.deadline).toBe(30);
    expect(rcTask.duration).toBe(3);
    expect(rcTask.start).toBe(3);
    expect(rcTask.end).toBe(6);
    expect(rcTask.lsd).toBe(25); // 30 - 3 - 2 = 25
    expect(rcTask.slack).toBe(22); // 25 - 3 = 22
    expect(rcTask.status).toBe('Safe');
  });
});
