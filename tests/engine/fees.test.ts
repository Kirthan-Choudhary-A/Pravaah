import { describe, it, expect } from 'vitest';
import { planScenario, type Scenario, type RulePack, type Decisions } from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

describe('Engine: Fee Calculations', () => {
  const scenarioA: Scenario = loadScenario('A');
  const scenarioC: Scenario = loadScenario('C');
  const packKA: RulePack = loadMergedRulePack('KA');
  const packSK: RulePack = loadMergedRulePack('SK');
  const decisions: Decisions = { form35: 'resolve', licenceRoute: 'online' };

  it('calculates ₹1,100 official total for Scenario A with 2 smart card issuances', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions,
    });

    // 200 (renewal) + 400 (2 cards) + 200 (address change) + 300 (motorcycle reg mark) = 1100
    expect(plan.fees.officialTotal).toBe(1100);
    expect(plan.fees.hasUnverified).toBe(true);
    expect(plan.fees.estimateCount).toBeGreaterThan(0);

    const challanFee = plan.fees.items.find((f) => f.id === 'fee-scenario-challans')!;
    expect(challanFee.tag).toBe('Scenario');
    expect(challanFee.amount).toBe(1000);
  });

  it('adds ₹500 hypothecation endorsement fee if loan carries over to destination', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: { form35: 'withdraw', licenceRoute: 'online' },
    });

    // 1100 + 500 (hypothecation endorsement on new RC) = 1600
    expect(plan.fees.officialTotal).toBe(1600);
  });

  it('marks unknown destination state re-registration fee as Hidden with null amount', () => {
    const plan = planScenario({
      scenario: scenarioC,
      mergedPack: packSK,
      decisions,
    });

    const hiddenFee = plan.fees.items.find((f) => f.tag === 'Hidden')!;
    expect(hiddenFee).toBeDefined();
    expect(hiddenFee.amount).toBeNull();
    expect(plan.fees.hiddenCount).toBe(1);
  });
});
