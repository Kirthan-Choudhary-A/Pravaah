import { describe, it, expect } from 'vitest';
import { compareOptions, type Scenario, type RulePack } from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

describe('Engine: Option Comparison and Ranking', () => {
  const scenarioA: Scenario = loadScenario('A');
  const packKA: RulePack = loadMergedRulePack('KA');

  it('ranks Resolve + online renewal as #1 for Scenario A', () => {
    const comparisons = compareOptions({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'online' },
    });

    expect(comparisons.length).toBeGreaterThan(1);
    const winner = comparisons[0]!;
    expect(winner.rank).toBe(1);
    expect(winner.decisions.form35).toBe('resolve');
    expect(winner.decisions.licenceRoute).toBe('online');
    expect(winner.expectedPlan.finish).toBe(31);
    expect(winner.slowPlan.finish).toBe(37);
  });

  it('never ranks a plan that lets the licence lapse above one that does not', () => {
    // Expiry on day 7 with a 40-day queue: only the online route renews in time.
    const comparisons = compareOptions({
      scenario: { ...scenarioA, licenceExpiryDay: 7, primarySlotQueue: 40 },
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'online' },
    });
    const winner = comparisons[0]!;
    expect(winner.licenceLapseDays).toBe(0);
    expect(winner.decisions.licenceRoute).toBe('online');
    const lapsing = comparisons.filter((c) => c.licenceLapseDays > 0);
    expect(lapsing.length).toBeGreaterThan(0);
    for (const c of lapsing) expect(c.rank).toBeGreaterThan(winner.rank);
    // Ranked list never has a lapsing plan before a non-lapsing one.
    const lapses = comparisons.map((c) => c.licenceLapseDays);
    expect(lapses).toEqual([...lapses].sort((a, b) => a - b));
  });

  it('generates up to 3 plain-English reasons, one trade-off, and one fallback', () => {
    const comparisons = compareOptions({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'online' },
    });

    const winner = comparisons[0]!;
    expect(winner.reasons.length).toBeGreaterThanOrEqual(1);
    expect(winner.reasons.length).toBeLessThanOrEqual(3);
    expect(winner.tradeOff).toBeDefined();
    expect(winner.tradeOff.length).toBeGreaterThan(0);
    expect(winner.fallbackLine).toBeDefined();
    expect(winner.fallbackLine.length).toBeGreaterThan(0);
  });

  it('flags unverified rule impact when another-RTO option is considered', () => {
    const comparisons = compareOptions({
      scenario: scenarioA,
      mergedPack: packKA,
      decisions: { form35: 'resolve', licenceRoute: 'online' },
    });

    const anotherRtoOption = comparisons.find((c) => c.decisions.licenceRoute === 'another-rto');
    expect(anotherRtoOption).toBeDefined();
    expect(anotherRtoOption?.unverifiedRuleImpact).toContain('licenceRenewalAtAnyRTO');
  });
});
