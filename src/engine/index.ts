/**
 * Pravaah Pure Planning Engine
 *
 * Rules:
 * - Pure TypeScript only (no React, no DOM, no network, no Date.now()).
 * - "Today" is Day 0. Time is measured in integer days [start, end).
 * - Data is passed in as arguments.
 */

export const ENGINE_VERSION = '0.1.0' as const;

export interface EngineTask {
  readonly id: string;
  readonly title: string;
  readonly durationDays: number;
  readonly startDay: number;
  readonly endDay: number;
  readonly dependencyIds: readonly string[];
}

export interface EnginePlan {
  readonly version: string;
  readonly tasks: readonly EngineTask[];
  readonly totalDays: number;
}

export function createPlanStub(): EnginePlan {
  return {
    version: ENGINE_VERSION,
    tasks: [],
    totalDays: 0,
  };
}
