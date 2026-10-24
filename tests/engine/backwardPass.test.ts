import { describe, it, expect } from 'vitest';
import {
  buildTasks,
  buildLinks,
  schedulePlan,
  computeBeta,
  type Scenario,
  type RulePack,
  type Decisions,
} from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

describe('Engine: Backward Pass (Latest Safe Date)', () => {
  const scenarioA: Scenario = loadScenario('A');
  const packKA: RulePack = loadMergedRulePack('KA');

  it('computes beta buffer accurately with formula max(2, ceil(0.3 * queue))', () => {
    expect(computeBeta(0)).toBe(2);
    expect(computeBeta(4)).toBe(2);
    expect(computeBeta(10)).toBe(3);
    expect(computeBeta(18)).toBe(6);
    expect(computeBeta(28)).toBe(9);
    expect(computeBeta(40)).toBe(12);
  });

  it('shifts in-person latestVisit to the day before travel if it falls in absence window', () => {
    // In-person RTO licence renewal route in Scenario A
    const decisions: Decisions = { form35: 'resolve', licenceRoute: 'rto-visit' };
    const tasks = buildTasks(scenarioA, packKA, decisions);
    const links = buildLinks(tasks);
    const result = schedulePlan(tasks, links, scenarioA, decisions);

    const dlTask = result.tasks.find((t) => t.id === 'task-licence-renewal')!;
    // Expiry Day 21, duration 3, slot 18, beta 6
    // Latest finish = 21, unadjusted LV = 21 - 3 - 6 = 12.
    // 12 is in [12, 25), so LV shifts to 11!
    expect(dlTask.latestVisit).toBe(11);
    expect(dlTask.bookingLSD).toBe(-7); // 11 - 18 = -7
    expect(dlTask.status).toBe('Missed');
  });

  it('computes Safe status for online licence renewal in Scenario A', () => {
    const decisions: Decisions = { form35: 'resolve', licenceRoute: 'online' };
    const tasks = buildTasks(scenarioA, packKA, decisions);
    const links = buildLinks(tasks);
    const result = schedulePlan(tasks, links, scenarioA, decisions);

    const dlTask = result.tasks.find((t) => t.id === 'task-licence-renewal')!;
    // Online renewal: deadline 21, duration 5, online buffer 2 -> LSD = 21 - 5 - 2 = 14
    expect(dlTask.lsd).toBe(14);
    expect(dlTask.slack).toBeGreaterThanOrEqual(3);
    expect(dlTask.status).toBe('Safe');
  });
});
