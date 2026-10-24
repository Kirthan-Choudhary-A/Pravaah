/**
 * Pravaah Pure Planning Engine — Public API
 *
 * Rules:
 * - Pure TypeScript only (no React, no DOM, no network, no Date.now()).
 * - "Today" is Day 0. Time is measured in integer days [start, end).
 * - All data is passed in as arguments.
 */

export const ENGINE_VERSION = '0.2.0' as const;

// Domain Types
export type {
  EngineTask,
  TaskLane,
  RuleBasis,
  SourceKind,
  SourceEntry,
  FeeTag,
  FeeItem,
  LicenceStagesConfig,
  RulePack,
  LinkType,
  Link,
  Task,
  TaskStatus,
  ScheduledTask,
  AbsenceWindow,
  SlotAlternative,
  VehicleMove,
  Scenario,
  Form35Decision,
  LicenceRouteDecision,
  Decisions,
  PlanningEvent,
  CheckResult,
  FeeSummary,
  BindingConstraint,
  PlanResult,
  PlanInput,
  OptionComparison,
  DiffItem,
  Diff,
  LicenceStageRow,
} from './model/types';

// Core Planning & Relations
export { planScenario } from './planner';
export { buildTasks } from './model/buildTasks';
export { buildLinks, taskRelations, type TaskRelations } from './graph/links';
export { schedulePlan, computeBeta } from './schedule/scheduler';
export { runChecks, licenceStages } from './checks/complianceChecks';
export { calculateFees } from './fees/feeCalculator';

// Options, Events, and Diff
export { compareOptions } from './options/optionComparator';
export { applyEvent } from './options/events';
export { diffPlans } from './options/diff';
