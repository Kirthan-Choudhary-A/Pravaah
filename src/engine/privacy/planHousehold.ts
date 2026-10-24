/**
 * Pure Household Planning Engine Helper
 *
 * Rules:
 * - Generates tasks in the 'household' lane only when granted consent includes 'view'.
 * - Uses the same time model, LSD formulas, and statuses as the main plan.
 * - Pure TypeScript with zero side-effects.
 */

import type {
  HouseholdVehicle,
  RulePack,
  Consent,
  ScheduledTask,
  TaskStatus,
} from '../model/types';
import { canAccess } from './fieldAccess';
import { maskPlate } from './masking';

export interface PlanHouseholdParams {
  readonly householdVehicles: readonly HouseholdVehicle[];
  readonly consents: readonly Consent[];
  readonly now: number;
  readonly currentDay?: number;
  readonly pack?: RulePack;
}

function planHouseholdSingle(
  vehicle: HouseholdVehicle,
  _pack: RulePack | undefined,
  consent: Consent | null,
  now: number
): ScheduledTask[] {
  // Check if grantee has active view permission
  if (!canAccess('vehicle.tasks', consent, now)) {
    return [];
  }

  const tasks: ScheduledTask[] = [];

  for (const item of vehicle.renewalItems || []) {
    const duration = item.duration > 0 ? item.duration : 1;
    const deadline = item.dueDate;

    // Start 7 days prior to due date or now, whichever is later
    const start = Math.max(now, deadline - 7);
    const end = start + duration;

    // Latest Safe Date (LSD): must start by deadline - duration
    const lsd = deadline - duration;
    const slack = lsd - start;

    let status: TaskStatus = 'Safe';
    if (slack < 0) {
      status = 'Missed';
    } else if (slack <= 2) {
      status = 'At risk';
    }

    const task: ScheduledTask = {
      id: `task-household-${item.id}`,
      name: `${item.name} (${maskPlate(vehicle.plate)})`,
      lane: 'household',
      duration,
      inPerson: false,
      deadline,
      basis: item.basis,
      sourceIds: [],
      why: item.why,
      start,
      end,
      lsd,
      latestFinish: deadline,
      slack,
      status,
      uncertain: !item.verified,
    };

    tasks.push(task);
  }

  return tasks;
}

export function planHousehold(
  vehicleOrParams: HouseholdVehicle | PlanHouseholdParams,
  packOrConsents?: RulePack | readonly Consent[],
  consentOrNow?: Consent | null | number,
  nowArg?: number
): ScheduledTask[] {
  if ('householdVehicles' in vehicleOrParams) {
    const { householdVehicles, consents, now, pack } = vehicleOrParams;
    const allTasks: ScheduledTask[] = [];
    for (const v of householdVehicles) {
      const activeConsent =
        consents.find(
          (c) => c.vehicleIds.includes(v.id) || c.vehicleIds.includes(v.plate)
        ) || null;
      allTasks.push(...planHouseholdSingle(v, pack, activeConsent, now));
    }
    return allTasks;
  }

  return planHouseholdSingle(
    vehicleOrParams,
    packOrConsents as RulePack | undefined,
    consentOrNow as Consent | null,
    nowArg ?? 0
  );
}
