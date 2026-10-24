import { describe, it, expect } from 'vitest';
import { planScenario, type Scenario, type RulePack, type Decisions } from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

describe('Engine: Compliance Checks', () => {
  const scenarioA: Scenario = loadScenario('A');
  const packKA: RulePack = loadMergedRulePack('KA');
  const defaultDecisions: Decisions = { form35: 'resolve', licenceRoute: 'online' };

  it('passes all 7 compliance checks on best plan for Scenario A', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: defaultDecisions,
    });

    expect(plan.checks).toHaveLength(7);
    for (const check of plan.checks) {
      expect(check.passed).toBe(true);
      expect(check.sourceName).toBeDefined();
    }
  });

  it('fails Aadhaar-after-NOC check if Aadhaar is updated early', () => {
    const plan = planScenario({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: defaultDecisions,
      events: [{ type: 'aadhaarEarly', day: 0 }],
    });

    const aadhaarCheck = plan.checks.find((c) => c.id === 'check-aadhaar-after-noc')!;
    expect(aadhaarCheck.passed).toBe(false);
    expect(aadhaarCheck.message).toContain('prior to NOC issuance');
  });

  it('fails licence validity check if RTO visit results in renewal after expiry', () => {
    const plan = planScenario({
      scenario: {
        ...scenarioA,
        licenceExpiryDay: 10, // Early expiry before owner returns
      },
      mergedPack: {
        ...packKA,
        licenceStages: {
          ...packKA.licenceStages,
          drivingAllowedDuringGrace: false,
        },
      },
      decisions: { form35: 'resolve', licenceRoute: 'rto-visit' },
    });

    const dlCheck = plan.checks.find((c) => c.id === 'check-licence-validity')!;
    expect(dlCheck.passed).toBe(false);
  });
});
