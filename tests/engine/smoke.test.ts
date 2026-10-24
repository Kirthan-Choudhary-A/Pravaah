import { describe, it, expect } from 'vitest';
import { ENGINE_VERSION, createPlanStub, type EngineTask, type EnginePlan } from '@engine';

describe('Engine Foundation Smoke Tests', () => {
  it('exports a valid ENGINE_VERSION string', () => {
    expect(ENGINE_VERSION).toBe('0.1.0');
  });

  it('initializes plan stub with pure deterministic default values', () => {
    const plan: EnginePlan = createPlanStub();
    expect(plan.version).toBe(ENGINE_VERSION);
    expect(plan.tasks).toEqual([]);
    expect(plan.totalDays).toBe(0);
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
