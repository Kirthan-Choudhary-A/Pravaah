import { describe, it, expect } from 'vitest';
import { ENGINE_VERSION, planScenario, type EngineTask } from '@engine';
import { loadScenario, loadMergedRulePack } from '../../src/data/index';

describe('Engine Foundation Smoke Tests', () => {
  it('exports a valid ENGINE_VERSION string', () => {
    expect(ENGINE_VERSION).toBe('0.2.0');
  });

  it('runs planScenario without errors on Scenario A', () => {
    const scenario = loadScenario('A');
    const pack = loadMergedRulePack('KA');
    const plan = planScenario({
      scenario,
      mergedPack: pack,
      decisions: { form35: 'resolve', licenceRoute: 'online' },
    });

    expect(plan.finish).toBe(31);
    expect(plan.tasks.length).toBeGreaterThan(0);
  });

  it('accepts valid EngineTask type structure', () => {
    const sampleTask: EngineTask = {
      id: 'task-dl-renewal',
      title: 'Driving Licence Renewal',
      durationDays: 7,
      startDay: 0,
      endDay: 7,
      dependencyIds: [],
    };
    expect(sampleTask.endDay).toBe(sampleTask.startDay + sampleTask.durationDays);
  });
});
