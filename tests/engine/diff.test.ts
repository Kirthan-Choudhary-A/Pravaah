import { describe, it, expect } from 'vitest';
import { planScenario, diffPlans, type Scenario, type RulePack, type Decisions } from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

describe('Engine: Plan Diffing', () => {
  const scenarioA: Scenario = loadScenario('A');
  const packKA: RulePack = loadMergedRulePack('KA');
  const decisions: Decisions = { form35: 'resolve', licenceRoute: 'online' };

  it('accurately identifies added tasks when Form 35 is rejected', () => {
    const beforePlan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions,
    });

    const afterPlan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions,
      events: [{ type: 'formRejected', day: 5 }],
    });

    const diff = diffPlans(beforePlan, afterPlan);

    expect(diff.tasksAdded).toContain('task-bank-consent-form28');
    expect(diff.tasksAdded).toContain('task-close-loan-new-rc');
    expect(diff.finishChange).toBeGreaterThan(0);
  });

  it('detects timing shifts when slot queue collapses to 28 days', () => {
    const beforePlan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions,
    });

    const afterPlan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions,
      events: [{ type: 'slotCollapse', queueDays: 28 }],
    });

    const diff = diffPlans(beforePlan, afterPlan);

    const reRegShift = diff.startEndShifts['task-re-registration-form27'];
    expect(reRegShift).toBeDefined();
    // Owner is back on Day 26; the 28-day queue moves the visit from Day 26 to Day 28 -> +2 days
    expect(reRegShift?.startDiff).toBe(2);
    expect(diff.finishChange).toBe(1); // from 31 to 32
  });
});
