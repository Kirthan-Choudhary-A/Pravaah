/**
 * Pure Deterministic Scheduler
 * Computes forward pass, backward pass (Latest Safe Date), critical path, and binding constraint.
 * Time model: integer days [start, end) where end = start + duration. Day 0 = today.
 */

import type {
  Task,
  Link,
  Scenario,
  Decisions,
  ScheduledTask,
  TaskStatus,
  BindingConstraint,
  PlanningEvent,
} from '../model/types';
import { ORDERING_LINK_TYPES } from '../graph/links';

export interface ScheduleOptions {
  readonly onlineBufferDays?: number;
  readonly betaMinDays?: number;
  readonly betaMultiplier?: number;
  readonly slotQueueOverride?: number;
  readonly events?: readonly PlanningEvent[];
}

export interface ScheduleResult {
  readonly tasks: readonly ScheduledTask[];
  readonly finish: number;
  readonly finishingTask: string;
  readonly criticalPath: readonly string[];
  readonly bindingConstraint: BindingConstraint;
}

export function computeBeta(slotQueue: number, minDays = 2, multiplier = 0.3): number {
  return Math.max(minDays, Math.ceil(multiplier * slotQueue));
}

export function schedulePlan(
  tasks: readonly Task[],
  links: readonly Link[],
  scenario: Scenario,
  decisions: Decisions,
  options: ScheduleOptions = {}
): ScheduleResult {
  const {
    onlineBufferDays = 2,
    betaMinDays = 2,
    betaMultiplier = 0.3,
    slotQueueOverride,
    events = [],
  } = options;

  // Build dependency map (only 'needs', 'unlocks', 'reuses' enforce hard execution ordering)
  const hardPredecessors: Record<string, string[]> = {};
  const hardSuccessors: Record<string, string[]> = {};

  for (const t of tasks) {
    hardPredecessors[t.id] = [];
    hardSuccessors[t.id] = [];
  }

  for (const l of links) {
    if (ORDERING_LINK_TYPES.has(l.type)) {
      hardPredecessors[l.to]?.push(l.from);
      hardSuccessors[l.from]?.push(l.to);
    }
  }

  // Determine effective slot queue
  let effectiveSlotQueue = slotQueueOverride ?? scenario.primarySlotQueue;
  const slotCollapseEvent = events.find((e) => e.type === 'slotCollapse');
  if (slotCollapseEvent) {
    effectiveSlotQueue = slotCollapseEvent.queueDays ?? 28;
  }

  // Determine effective absence window
  const absenceStart = scenario.absence.start;
  let absenceEnd = scenario.absence.end;
  const tripExtendedEvent = events.find((e) => e.type === 'tripExtended');
  if (tripExtendedEvent) {
    absenceEnd += tripExtendedEvent.additionalDays ?? 7;
  }

  const hasAadhaarEarly = events.some((e) => e.type === 'aadhaarEarly');

  // Forward Pass
  const startTimes: Record<string, number> = {};
  const endTimes: Record<string, number> = {};
  const delayReasons: Record<string, { type: 'dependency' | 'slot' | 'absence'; desc: string }> =
    {};

  // Topological / dependency resolution
  const resolved = new Set<string>();
  const remaining = new Set(tasks.map((t) => t.id));

  while (remaining.size > 0) {
    let progressed = false;

    for (const taskId of Array.from(remaining)) {
      const preds = hardPredecessors[taskId] ?? [];
      const allPredsResolved = preds.every((p) => resolved.has(p));

      if (allPredsResolved) {
        const task = tasks.find((t) => t.id === taskId)!;

        if (task.unknown) {
          startTimes[taskId] = 0;
          endTimes[taskId] = 0;
          resolved.add(taskId);
          remaining.delete(taskId);
          progressed = true;
          continue;
        }

        let earliestFromPreds = 0;
        let bindingPredId: string | undefined;

        for (const p of preds) {
          const pEnd = endTimes[p] ?? 0;
          if (pEnd > earliestFromPreds) {
            earliestFromPreds = pEnd;
            bindingPredId = p;
          }
        }

        if (task.id === 'task-aadhaar-update' && hasAadhaarEarly) {
          startTimes[taskId] = 0;
          endTimes[taskId] = 0;
        } else if (task.inPerson) {
          // In-person tasks start on their visit day!
          // Determine slot queue for this task
          let taskSlotQueue = effectiveSlotQueue;
          if (task.id === 'task-licence-renewal' && decisions.licenceRoute === 'another-rto') {
            const alt =
              scenario.alternativeSlots?.find((s) => s.rtoCode === decisions.alternativeRTO) ??
              scenario.alternativeSlots?.[0];
            if (alt) {
              taskSlotQueue = alt.queueDays;
            }
          }

          let visitDay = Math.max(earliestFromPreds, taskSlotQueue);

          if (visitDay > earliestFromPreds && taskSlotQueue >= earliestFromPreds) {
            delayReasons[taskId] = {
              type: 'slot',
              desc: `Delayed until earliest appointment slot at day ${taskSlotQueue}.`,
            };
          } else if (bindingPredId) {
            delayReasons[taskId] = {
              type: 'dependency',
              desc: `Waited for dependency "${bindingPredId}" to complete on day ${earliestFromPreds}.`,
            };
          }

          // If decision is explicitly 'another-date', citizen waits until after scheduled absence
          if (task.id === 'task-licence-renewal' && decisions.licenceRoute === 'another-date') {
            if (visitDay < absenceEnd) {
              visitDay = absenceEnd;
              delayReasons[taskId] = {
                type: 'absence',
                desc: `Deferred appointment until day ${absenceEnd} after returning from scheduled absence.`,
              };
            }
          }

          // Cannot visit while away!
          if (visitDay >= absenceStart && visitDay < absenceEnd) {
            visitDay = absenceEnd;
            delayReasons[taskId] = {
              type: 'absence',
              desc: `Owner is out of town from day ${absenceStart} to day ${absenceEnd}; visit postponed to day ${absenceEnd}.`,
            };
          }

          startTimes[taskId] = visitDay;
          endTimes[taskId] = visitDay + task.duration;
        } else {
          startTimes[taskId] = earliestFromPreds;
          endTimes[taskId] = earliestFromPreds + task.duration;

          if (bindingPredId) {
            delayReasons[taskId] = {
              type: 'dependency',
              desc: `Waited for prerequisite "${bindingPredId}" to complete on day ${earliestFromPreds}.`,
            };
          }
        }

        resolved.add(taskId);
        remaining.delete(taskId);
        progressed = true;
      }
    }

    if (!progressed && remaining.size > 0) {
      // Break any remaining cycle or unknown unresolvable
      for (const id of remaining) {
        startTimes[id] = 0;
        endTimes[id] = 0;
        resolved.add(id);
      }
      break;
    }
  }

  // Plan Finish: max end over all known tasks
  let planFinish = 0;
  let finishingTaskId = tasks[0]?.id ?? '';

  for (const t of tasks) {
    if (!t.unknown) {
      const e = endTimes[t.id] ?? 0;
      if (e >= planFinish) {
        planFinish = e;
        finishingTaskId = t.id;
      }
    }
  }

  // Backward Pass (Latest Safe Date - LSD)
  const latestFinishes: Record<string, number> = {};
  const lsds: Record<string, number> = {};
  const bookingLSDs: Record<string, number> = {};
  const latestVisits: Record<string, number> = {};

  // Topological reverse order
  const reverseOrder = Array.from(tasks).reverse();

  for (const task of reverseOrder) {
    if (task.unknown) {
      lsds[task.id] = 0;
      latestFinishes[task.id] = 0;
      continue;
    }

    let minSuccLSD = Infinity;
    const succs = hardSuccessors[task.id] ?? [];

    for (const succId of succs) {
      const succTask = tasks.find((t) => t.id === succId);
      if (succTask && !succTask.unknown) {
        // For in-person dependants, the predecessor must finish before their latest visit!
        const succLimit = succTask.inPerson
          ? (latestVisits[succId] ?? lsds[succId] ?? planFinish)
          : (lsds[succId] ?? planFinish);

        if (succLimit < minSuccLSD) {
          minSuccLSD = succLimit;
        }
      }
    }

    let lf = task.deadline !== undefined ? task.deadline : planFinish;
    if (minSuccLSD !== Infinity && minSuccLSD < lf) {
      lf = minSuccLSD;
    }
    latestFinishes[task.id] = lf;

    if (task.inPerson) {
      let taskSlotQueue = effectiveSlotQueue;
      if (task.id === 'task-licence-renewal' && decisions.licenceRoute === 'another-rto') {
        const alt =
          scenario.alternativeSlots?.find((s) => s.rtoCode === decisions.alternativeRTO) ??
          scenario.alternativeSlots?.[0];
        if (alt) {
          taskSlotQueue = alt.queueDays;
        }
      }

      const beta = computeBeta(taskSlotQueue, betaMinDays, betaMultiplier);
      let lv = lf - task.duration - beta;

      // If latestVisit falls in an absence window, move it to the day before
      if (lv >= absenceStart && lv < absenceEnd) {
        lv = absenceStart - 1;
      }

      latestVisits[task.id] = lv;
      const bLsd = lv - taskSlotQueue;
      bookingLSDs[task.id] = bLsd;
      lsds[task.id] = bLsd;
    } else {
      lsds[task.id] = lf - task.duration - onlineBufferDays;
    }
  }

  // Assemble Scheduled Tasks with Slack & Status
  const scheduledTasks: ScheduledTask[] = tasks.map((task) => {
    if (task.unknown) {
      return {
        ...task,
        start: 0,
        end: 0,
        lsd: 0,
        latestFinish: 0,
        slack: 0,
        status: 'Unknown' as TaskStatus,
      };
    }

    const start = startTimes[task.id] ?? 0;
    const end = endTimes[task.id] ?? start + task.duration;
    const lsd = lsds[task.id] ?? 0;
    const lf = latestFinishes[task.id] ?? planFinish;

    // Slack computation:
    // For in-person tasks, booking slack is bookingLSD - Day 0.
    // For online tasks, slack is LSD - start.
    const slack = task.inPerson ? (bookingLSDs[task.id] ?? 0) : lsd - start;

    let status: TaskStatus;
    if (slack >= 3) {
      status = 'Safe';
    } else if (slack >= 0) {
      status = 'At risk';
    } else {
      status = 'Missed';
    }

    const scheduled: ScheduledTask = {
      ...task,
      start,
      end,
      lsd,
      latestFinish: lf,
      slack,
      status,
      ...(task.inPerson
        ? { bookingLSD: bookingLSDs[task.id], latestVisit: latestVisits[task.id] }
        : {}),
    };

    return scheduled;
  });

  // Identify Critical Path: trace from finishing task backwards through tightest dependencies
  const criticalPath: string[] = [];
  let curr: string | undefined = finishingTaskId;
  const visitedCrit = new Set<string>();

  while (curr && !visitedCrit.has(curr)) {
    visitedCrit.add(curr);
    criticalPath.unshift(curr);
    const preds = hardPredecessors[curr] ?? [];
    if (preds.length === 0) break;

    // Pick predecessor with highest end time that matches or is closest to curr start
    const currStart = startTimes[curr] ?? 0;
    let bestPred: string | undefined;
    let maxPredEnd = -1;

    for (const p of preds) {
      const pEnd = endTimes[p] ?? 0;
      if (pEnd <= currStart && pEnd > maxPredEnd) {
        maxPredEnd = pEnd;
        bestPred = p;
      }
    }
    curr = bestPred;
  }

  // Determine Binding Constraint
  const delayInfo = delayReasons[finishingTaskId];
  let bindingConstraint: BindingConstraint;

  if (delayInfo) {
    bindingConstraint = {
      type: delayInfo.type,
      description: delayInfo.desc,
      taskId: finishingTaskId,
    };
  } else if (criticalPath.length > 1) {
    const parentId = criticalPath[criticalPath.length - 2]!;
    bindingConstraint = {
      type: 'dependency',
      description: `Plan finish is driven by sequence ending with task "${finishingTaskId}", dependent on "${parentId}".`,
      taskId: finishingTaskId,
    };
  } else {
    bindingConstraint = {
      type: 'dependency',
      description: `Plan finish is set by standalone task "${finishingTaskId}".`,
      taskId: finishingTaskId,
    };
  }

  return {
    tasks: scheduledTasks,
    finish: planFinish,
    finishingTask: finishingTaskId,
    criticalPath,
    bindingConstraint,
  };
}
