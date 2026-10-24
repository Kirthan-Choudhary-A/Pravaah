import type {
  Scenario,
  RulePack,
  SourceEntry,
  PlanResult,
  Decisions,
  PlanningEvent,
  OptionComparison,
  Diff,
  Form35Decision,
  LicenceRouteDecision,
} from '@engine/model/types';

export type ScenarioId = 'A' | 'B' | 'C';

export interface SimulatorParameters {
  readonly primarySlotQueue: number;
  readonly absenceStart: number;
  readonly absenceEnd: number;
  readonly nocProcessingDays: number;
  readonly bankConsentForm28Days: number;
}

export type EventTypeKey =
  'slotCollapse' | 'tripExtended' | 'unknownJurisdiction' | 'formRejected' | 'aadhaarEarly';

export interface PlanContextValue {
  readonly scenarioId: ScenarioId;
  readonly scenario: Scenario;
  readonly rulePack: RulePack;
  readonly sources: readonly SourceEntry[];
  readonly parameters: SimulatorParameters;
  readonly decisions: Decisions;
  readonly activeEvents: readonly PlanningEvent[];
  readonly currentPlan: PlanResult;
  readonly previousPlan: PlanResult | null;
  readonly planDiff: Diff;
  readonly optionsComparison: readonly OptionComparison[];
  readonly selectedTaskId: string | null;
  readonly isDegraded: boolean;
  readonly announcement: string;

  // Actions
  readonly setScenarioId: (id: ScenarioId) => void;
  readonly setForm35Decision: (decision: Form35Decision) => void;
  readonly setLicenceRouteDecision: (decision: LicenceRouteDecision) => void;
  readonly setAlternativeRTO: (rto: string) => void;
  readonly setParameter: <K extends keyof SimulatorParameters>(
    key: K,
    value: SimulatorParameters[K]
  ) => void;
  readonly toggleEvent: (eventKey: EventTypeKey) => void;
  readonly resetToScenarioDefaults: () => void;
  readonly selectTask: (taskId: string | null) => void;
}
