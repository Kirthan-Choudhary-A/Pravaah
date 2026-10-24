import { describe, it, expect } from 'vitest';
import { calculateAllMetrics } from '../../src/utils/metricsCalculator';
import { GOLD_PLANS } from '../../src/data/gold/goldPlans';

describe('Challenge metrics are reproducible and internally consistent', () => {
  const report = calculateAllMetrics();

  it('passes every gold scenario and says which ones check ordering', () => {
    expect(report.metric1.totalCount).toBe(GOLD_PLANS.length);
    expect(report.metric1.passedCount).toBe(report.metric1.totalCount);
    expect(report.metric1.orderingTotal).toBe(GOLD_PLANS.filter((g) => !g.customCheck).length);
    expect(report.metric1.orderingTotal).toBeLessThan(report.metric1.totalCount);
    expect(report.metric1.disclaimer).toMatch(/regression check/i);
  });

  it('every hand-derived finish day is written down', () => {
    for (const g of GOLD_PLANS.filter((p) => p.expectedFinishDay !== undefined)) {
      expect(g.derivation, `${g.id} needs a derivation`).toBeTruthy();
    }
  });

  it('reports the first reading and the offered reading separately', () => {
    const m = report.metric2;
    expect(m.readBackCorrect).toBeGreaterThanOrEqual(m.firstPassCorrect);
    expect(m.wrongFirstReading).toBe(m.totalTranscripts - m.firstPassCorrect);
    expect(m.disclaimer).toMatch(/upper bound/i);
  });

  it('separates the online route from scheduling quality', () => {
    const m = report.metric3;
    const [informed, noOnline] = m.additional;
    expect(informed).toBeDefined();
    expect(noOnline).toBeDefined();
    // Taking the online route alone beats the always-in-person baseline...
    expect(informed!.renewedBeforeExpiryPercent).toBeGreaterThan(
      m.naiveBaseline.renewedBeforeExpiryPercent
    );
    // ...and ranking never lets the licence lapse more often than just going online.
    expect(m.pravaah.renewedBeforeExpiryPercent).toBeGreaterThanOrEqual(
      informed!.renewedBeforeExpiryPercent
    );
    // Without the online route Pravaah still beats the naive baseline, by less.
    expect(noOnline!.renewedBeforeExpiryPercent).toBeGreaterThan(
      m.naiveBaseline.renewedBeforeExpiryPercent
    );
    expect(m.assumptions.join(' ')).toMatch(/unverified/i);
  });

  it('is deterministic for the same seed', () => {
    const again = calculateAllMetrics();
    expect(again.metric3.pravaah).toEqual(report.metric3.pravaah);
    expect(again.metric3.additional).toEqual(report.metric3.additional);
  });
});
