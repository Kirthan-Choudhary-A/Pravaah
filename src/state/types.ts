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
  HouseholdVehicle,
  Consent,
  ConsentScope,
  AuditEntry,
  RevealResult,
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

  // Household & Privacy State
  readonly householdVehicles: readonly HouseholdVehicle[];
  readonly consents: readonly Consent[];
  readonly auditLog: readonly AuditEntry[];
  readonly activeRole: 'You' | 'Family member';
  readonly revealedFields: Record<string, { readonly value: string; readonly expiresAt: number }>;

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

  // Household & Privacy Actions
  readonly setActiveRole: (role: 'You' | 'Family member') => void;
  readonly requestConsent: (params: {
    grantorRole: string;
    vehicleIds: string[];
    scopes: ConsentScope[];
    days?: number;
  }) => { ok: boolean; error?: string };
  readonly grantConsentAction: (consentId: string, scopes?: ConsentScope[]) => { ok: boolean; error?: string };
  readonly declineConsentAction: (consentId: string) => { ok: boolean; error?: string };
  readonly revokeConsentAction: (consentId: string) => { ok: boolean; error?: string };
  readonly revealFieldAction: (params: {
    field: string;
    rawValue: string;
    purpose: string;
    consentId?: string;
    vehicleKeys?: readonly string[];
  }) => RevealResult;
  readonly hideFieldAction: (field: string) => void;
  readonly addVehicleAction: (vehicle: HouseholdVehicle) => void;
  readonly clearAuditLogAction: () => void;
  readonly resetDemoAction: () => void;
}
