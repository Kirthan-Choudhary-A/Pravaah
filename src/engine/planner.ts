/**
 * Pure Plan Scenario Function
 * Coordinates task building, linking, scheduling, checks, and fee calculation.
 */

import type { PlanInput, PlanResult } from './model/types';
import { buildTasks } from './model/buildTasks';
import { buildLinks } from './graph/links';
import { schedulePlan } from './schedule/scheduler';
import { runChecks } from './checks/complianceChecks';
import { calculateFees } from './fees/feeCalculator';

export function planScenario(input: PlanInput): PlanResult {
  const { scenario, mergedPack, decisions, events = [], isSlow = false } = input;

  const isDegraded = scenario.move.toState === 'SK' || mergedPack.stateCode === 'SK';

  // 1. Build domain tasks
  const rawTasks = buildTasks(scenario, mergedPack, decisions, events, {
    isSlow,
    isDegraded,
  });

  // 2. Build dependency links
  const links = buildLinks(rawTasks, events);

  // 3. Schedule tasks (forward pass, LSD, critical path, binding constraint)
  const scheduled = schedulePlan(rawTasks, links, scenario, decisions, {
    events,
  });

  // 4. Run compliance checks
  const checks = runChecks(scheduled.tasks, scenario, mergedPack, events);

  // 5. Calculate fees
  const fees = calculateFees(scheduled.tasks, scenario, mergedPack, isDegraded);

  return {
    tasks: scheduled.tasks,
    links,
    checks,
    fees,
    finish: scheduled.finish,
    finishingTask: scheduled.finishingTask,
    criticalPath: scheduled.criticalPath,
    bindingConstraint: scheduled.bindingConstraint,
    degradedMode: isDegraded,
    isSlowRun: isSlow,
  };
}
