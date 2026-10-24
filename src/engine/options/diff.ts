/**
 * Pure Plan Differ
 * Compares two plan results and outputs structural and timing differences.
 */

import type { PlanResult, Diff, TaskStatus, DiffItem } from '../model/types';

export function diffPlans(
  before: PlanResult,
  after: PlanResult,
  recommendationBefore?: string,
  recommendationAfter?: string
): Diff {
  const beforeTaskIds = new Set(before.tasks.map((t) => t.id));
  const afterTaskIds = new Set(after.tasks.map((t) => t.id));

  const tasksAdded: string[] = [];
  const tasksRemoved: string[] = [];

  for (const id of afterTaskIds) {
    if (!beforeTaskIds.has(id)) {
      tasksAdded.push(id);
    }
  }

  for (const id of beforeTaskIds) {
    if (!afterTaskIds.has(id)) {
      tasksRemoved.push(id);
    }
  }

  const startEndShifts: Record<string, { startDiff: number; endDiff: number }> = {};
  const statusChanges: Record<string, DiffItem<TaskStatus>> = {};

  const beforeMap = new Map(before.tasks.map((t) => [t.id, t]));
  const afterMap = new Map(after.tasks.map((t) => [t.id, t]));

  for (const [id, aTask] of afterMap) {
    const bTask = beforeMap.get(id);
    if (bTask) {
      const startDiff = aTask.start - bTask.start;
      const endDiff = aTask.end - bTask.end;
      if (startDiff !== 0 || endDiff !== 0) {
        startEndShifts[id] = { startDiff, endDiff };
      }

      if (aTask.status !== bTask.status) {
        statusChanges[id] = {
          before: bTask.status,
          after: aTask.status,
        };
      }
    }
  }

  // Checks changed
  const beforeCheckMap = new Map(before.checks.map((c) => [c.id, c.passed]));
  const checksChanged: string[] = [];

  for (const c of after.checks) {
    const bPassed = beforeCheckMap.get(c.id);
    if (bPassed !== undefined && bPassed !== c.passed) {
      checksChanged.push(
        `${c.ruleName} changed from ${bPassed ? 'PASSED' : 'FAILED'} to ${c.passed ? 'PASSED' : 'FAILED'}`
      );
    }
  }

  const finishChange = after.finish - before.finish;
  const recChanged =
    recommendationBefore !== undefined && recommendationAfter !== undefined
      ? recommendationBefore !== recommendationAfter
      : false;

  return {
    tasksAdded,
    tasksRemoved,
    startEndShifts,
    statusChanges,
    checksChanged,
    finishChange,
    recommendationChanged: recChanged,
    ...(recommendationBefore ? { recommendationBefore } : {}),
    ...(recommendationAfter ? { recommendationAfter } : {}),
  };
}
