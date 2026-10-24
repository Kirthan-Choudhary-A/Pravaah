import { describe, it, expect } from 'vitest';
import {
  buildTasks,
  buildLinks,
  schedulePlan,
  type Scenario,
  type RulePack,
  type Decisions,
} from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

describe('Engine: Forward Pass Scheduling', () => {
  const scenarioA: Scenario = loadScenario('A');
  const packKA: RulePack = loadMergedRulePack('KA');
  const decisions: Decisions = { form35: 'resolve', licenceRoute: 'online' };

  it('schedules prerequisites before dependants', () => {
    const tasks = buildTasks(scenarioA, packKA, decisions);
    const links = buildLinks(tasks);
    const result = schedulePlan(tasks, links, scenarioA, decisions);

    const taskMap = new Map(result.tasks.map((t) => [t.id, t]));

    // Pay challan and Form 35 must finish before NOC starts
    const challan = taskMap.get('task-pay-echallan')!;
    const form35 = taskMap.get('task-form35-action')!;
    const noc = taskMap.get('task-noc-form28')!;

    expect(challan.end).toBeLessThanOrEqual(noc.start);
    expect(form35.end).toBeLessThanOrEqual(noc.start);
    expect(noc.start).toBe(Math.max(challan.end, form35.end));
  });

  it('postpones in-person visits to after owner travel absence', () => {
    const tasks = buildTasks(scenarioA, packKA, decisions);
    const links = buildLinks(tasks);
    const result = schedulePlan(tasks, links, scenarioA, decisions);

    const reReg = result.tasks.find((t) => t.id === 'task-re-registration-form27')!;
    // Owner is away days 12–25 inclusive, so the visit starts on Day 26
    expect(reReg.start).toBe(26);
    expect(reReg.end).toBe(26 + reReg.duration);
  });

  it('matches plan finish to the maximum end of all tasks', () => {
    const tasks = buildTasks(scenarioA, packKA, decisions);
    const links = buildLinks(tasks);
    const result = schedulePlan(tasks, links, scenarioA, decisions);

    const maxEnd = Math.max(...result.tasks.filter((t) => !t.unknown).map((t) => t.end));
    expect(result.finish).toBe(maxEnd);
    expect(result.finishingTask).toBe('task-licence-address-change');
  });
});
