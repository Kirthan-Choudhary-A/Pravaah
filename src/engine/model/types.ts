/**
 * Pravaah Engine Domain Models and Types
 * Pure TypeScript. Zero dependencies.
 */

export interface EngineTask {
  readonly id: string;
  readonly title: string;
  readonly durationDays: number;
  readonly startDay: number;
  readonly endDay: number;
  readonly dependencyIds: readonly string[];
}

export type TaskLane = 'licence' | 'vehicle' | 'identity' | 'household';

export type RuleBasis = 'statute' | 'notification' | 'state-portal' | 'modelled';

export type SourceKind = 'statute' | 'notification' | 'state-portal' | 'official-portal';

export interface SourceEntry {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly publisher: string;
  readonly kind: SourceKind;
  readonly lastChecked: string;
  readonly verified: boolean;
  readonly note: string;
}

export type FeeTag = 'Official' | 'Estimate' | 'Scenario' | 'Hidden';

export interface FeeItem {
  readonly id: string;
  readonly label: string;
  readonly amount: number | null;
  readonly tag: FeeTag;
  readonly sourceIds: readonly string[];
  readonly lastChecked: string;
  readonly verified: boolean;
  readonly note: string;
}

export interface LicenceStagesConfig {
  readonly renewalWindowDays: number;
  readonly graceDays: number;
  readonly drivingAllowedDuringGrace: boolean;
  readonly lateFee: {
    readonly base: number;
    readonly perYear: number;
  };
  readonly testAfterDays: number;
  readonly verified: boolean;
  readonly basis: RuleBasis;
  readonly sourceIds: readonly string[];
  readonly note: string;
}

export interface RulePack {
  readonly stateCode: string;
  readonly version: string;
  readonly isCentral?: boolean;
  readonly licenceStages: LicenceStagesConfig;
  readonly reRegistrationLimitDays: {
    readonly value: number;
    readonly basis: RuleBasis;
    readonly sourceIds: readonly string[];
    readonly verified: boolean;
    readonly note: string;
  };
  readonly rcAddressIntimationDays: {
    readonly value: number;
    readonly basis: RuleBasis;
    readonly sourceIds: readonly string[];
    readonly verified: boolean;
    readonly note: string;
  };
  readonly servicesOnline: {
    readonly licenceRenewal: boolean;
    readonly licenceAddressChange: boolean;
    readonly otherServices: readonly string[];
    readonly basis: RuleBasis;
    readonly sourceIds: readonly string[];
    readonly verified: boolean;
    readonly note: string;
  };
  readonly licenceRenewalAtAnyRTO: {
    readonly value: boolean;
    readonly basis: RuleBasis;
    readonly sourceIds: readonly string[];
    readonly verified: boolean;
    readonly note: string;
  };
  readonly nocBlockedBy: readonly string[];
  readonly nocAddressMustMatchRC: {
    readonly value: boolean;
    readonly basis: RuleBasis;
    readonly note: string;
  };
  /** Only states whose plates encode the vehicle class carry this (Delhi, unverified). */
  readonly classLetters?: {
    readonly S: string;
    readonly C: string;
    readonly basis?: RuleBasis;
    readonly verified?: boolean;
    readonly sourceIds?: readonly string[];
    readonly note?: string;
  };
  readonly bhSeries: {
    readonly exemptFromNOC: boolean;
    readonly exemptFromReRegistration: boolean;
  };
  readonly fees: readonly FeeItem[];
}

export type LinkType = 'needs' | 'unlocks' | 'reuses' | 'propagates' | 'invalidates';

export interface Link {
  readonly from: string;
  readonly to: string;
  readonly type: LinkType;
  readonly reason: string;
  readonly basis: RuleBasis;
  readonly sourceIds: readonly string[];
  readonly verified: boolean;
  /** Always-visible consequence of breaking this link's order, e.g. an invalidation. */
  readonly warning?: string;
}

export interface Task {
  readonly id: string;
  readonly name: string;
  readonly lane: TaskLane;
  readonly duration: number;
  readonly inPerson: boolean;
  readonly deadline?: number;
  readonly basis: RuleBasis;
  readonly sourceIds: readonly string[];
  readonly why: string;
  readonly unknown?: boolean;
  readonly uncertain?: boolean;
}

export type TaskStatus = 'Safe' | 'At risk' | 'Missed' | 'Unknown';

export interface ScheduledTask extends Task {
  readonly start: number;
  readonly end: number;
  readonly lsd: number;
  readonly latestFinish: number;
  readonly slack: number;
  readonly status: TaskStatus;
  readonly isCritical?: boolean;
  readonly bookingLSD?: number;
  readonly latestVisit?: number;
}

export interface AbsenceWindow {
  readonly start: number;
  readonly end: number; // half-open [start, end)
}

export interface SlotAlternative {
  readonly rtoCode: string;
  readonly queueDays: number;
  readonly simulated: true;
}

export interface VehicleMove {
  readonly fromState: string;
  readonly fromRTO: string;
  readonly toState: string;
  readonly toRTO: string;
  readonly vehicleType: 'two-wheeler' | 'car';
  readonly isBHSeries: boolean;
  readonly movedOnDay: number;
}

export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly move: VehicleMove;
  readonly licenceExpiryDay: number;
  readonly primarySlotQueue: number;
  readonly alternativeSlots?: readonly SlotAlternative[];
  readonly absence: AbsenceWindow;
  readonly blockers: {
    readonly form35Open: boolean;
    readonly unpaidChallansCount: number;
    readonly unpaidChallansAmount: number;
  };
  readonly timings: {
    readonly nocProcessingDays: number;
    readonly bankConsentForm28Days: number;
  };
  readonly addressProofType: 'registered-rental-agreement' | 'other';
}

export type Form35Decision = 'wait' | 'withdraw' | 'resolve';
export type LicenceRouteDecision = 'online' | 'rto-visit' | 'another-rto' | 'another-date';

export interface Decisions {
  readonly form35: Form35Decision;
  readonly licenceRoute: LicenceRouteDecision;
  readonly alternativeRTO?: string;
}

export type PlanningEvent =
  | { readonly type: 'formRejected'; readonly day?: number }
  | { readonly type: 'unknownJurisdiction'; readonly targetState?: string }
  | { readonly type: 'slotCollapse'; readonly queueDays?: number }
  | { readonly type: 'tripExtended'; readonly additionalDays?: number }
  | { readonly type: 'aadhaarEarly'; readonly day?: number };

export interface CheckResult {
  readonly id: string;
  readonly ruleName: string;
  readonly sourceName: string;
  readonly passed: boolean;
  readonly message: string;
  readonly details?: string;
}

export interface FeeSummary {
  readonly items: readonly FeeItem[];
  readonly officialTotal: number;
  readonly estimateCount: number;
  readonly hiddenCount: number;
  readonly hasUnverified: boolean;
}

export interface BindingConstraint {
  readonly type: 'dependency' | 'slot' | 'absence' | 'deadline';
  readonly description: string;
  readonly taskId: string;
}

export interface PlanResult {
  readonly tasks: readonly ScheduledTask[];
  readonly links: readonly Link[];
  readonly checks: readonly CheckResult[];
  readonly fees: FeeSummary;
  readonly finish: number;
  readonly finishingTask: string;
  readonly criticalPath: readonly string[];
  readonly bindingConstraint: BindingConstraint;
  readonly degradedMode: boolean;
  readonly isSlowRun?: boolean;
}

export interface PlanInput {
  readonly scenario: Scenario;
  readonly mergedPack: RulePack;
  readonly decisions: Decisions;
  readonly events?: readonly PlanningEvent[];
  readonly isSlow?: boolean;
  readonly assumptions?: Record<string, number>;
}

export interface OptionComparison {
  readonly decisions: Decisions;
  readonly expectedPlan: PlanResult;
  readonly slowPlan: PlanResult;
  readonly rank: number;
  readonly reasons: readonly string[];
  readonly tradeOff: string;
  readonly fallbackLine: string;
  readonly unverifiedRuleImpact?: string;
  readonly extraStepsCount: number;
  readonly visitCount: number;
  /** Days the licence renewal finishes after expiry (0 = renewed in time). Ranked first. */
  readonly licenceLapseDays: number;
  readonly slowLicenceLapseDays: number;
  readonly deadlineBreaches: number;
  readonly slowDeadlineBreaches: number;
  readonly unknownStepsCount: number;
  readonly failedChecksCount: number;
}

export interface DiffItem<T> {
  readonly before: T;
  readonly after: T;
}

export interface Diff {
  readonly tasksAdded: readonly string[];
  readonly tasksRemoved: readonly string[];
  readonly startEndShifts: Record<string, { readonly startDiff: number; readonly endDiff: number }>;
  readonly statusChanges: Record<string, DiffItem<TaskStatus>>;
  readonly checksChanged: readonly string[];
  readonly finishChange: number;
  readonly recommendationChanged: boolean;
  readonly recommendationBefore?: string;
  readonly recommendationAfter?: string;
}

export interface LicenceStageRow {
  readonly stage: string;
  readonly interval: string;
  readonly drivingAllowed: boolean;
  readonly lateFeeAmount: number;
  readonly testRequired: boolean;
  readonly note: string;
}

// ---------------------------------------------------------------------------
// Step 4: Privacy, Household Consent, Audit & Plate Parsing Types
// ---------------------------------------------------------------------------

export type ConsentScope = 'view' | 'apply' | 'register_new';

export type ConsentStatus = 'none' | 'pending' | 'granted' | 'declined' | 'revoked' | 'expired';

export interface Consent {
  readonly id: string;
  readonly grantorRole: string; // e.g. "Family member"
  readonly granteeRole: string; // e.g. "You"
  readonly vehicleIds: readonly string[];
  readonly scopes: readonly ConsentScope[];
  readonly until: number; // Day integer relative to timeline or epoch
  readonly status: ConsentStatus;
}

export type AuditAction =
  'request' | 'grant' | 'decline' | 'revoke' | 'expire' | 'reveal' | 'apply';

export type AuditResult = 'allowed' | 'denied' | 'completed';

export interface AuditEntry {
  readonly id: string;
  readonly at: number;
  readonly actor: string;
  readonly subject: string;
  readonly field: string;
  readonly action: AuditAction;
  readonly purpose?: string;
  readonly result: AuditResult;
}

export interface RevealSuccess {
  readonly ok: true;
  readonly value: string;
  readonly expiresAt: number;
  readonly auditEntry: AuditEntry;
}

export interface RevealFailure {
  readonly ok: false;
  readonly error: string;
}

export type RevealResult = RevealSuccess | RevealFailure;

export interface TransitionSuccess {
  readonly ok: true;
  readonly consent: Consent;
  readonly auditEntry: AuditEntry;
}

export interface TransitionFailure {
  readonly ok: false;
  readonly error: string;
}

export type TransitionResult = TransitionSuccess | TransitionFailure;

export interface HouseholdRenewalItem {
  readonly id: string;
  readonly name: string;
  readonly dueDate: number;
  readonly duration: number;
  readonly basis: RuleBasis;
  readonly verified: boolean;
  readonly why: string;
  readonly fee?: number;
}

export interface HouseholdVehicle {
  readonly id: string;
  readonly plate: string;
  readonly vehicleType: string;
  readonly ownerRole: string;
  readonly renewalItems: readonly HouseholdRenewalItem[];
  readonly aadhaarDemo?: string;
  readonly dlDemo?: string;
  readonly engineDemo?: string;
  readonly chassisDemo?: string;
  readonly challansDemo?: readonly {
    readonly id: string;
    readonly amount: number;
    readonly location: string;
  }[];
}

export interface PlateFix {
  readonly position: number;
  readonly original: string;
  readonly corrected: string;
  readonly reason: string;
}

export interface ParsedPlate {
  readonly raw: string;
  readonly state: string;
  readonly rto: string;
  readonly series: string;
  readonly number: string;
  readonly formatted: string;
  readonly format: 'standard' | 'delhi' | 'bh';
  readonly fixes: readonly PlateFix[];
  readonly isValid: boolean;
  readonly error?: string;
}

export interface PlateParseResult {
  readonly success: boolean;
  readonly candidates: readonly ParsedPlate[];
  readonly error?: string;
}

export interface ClassCheckResult {
  readonly status: 'match' | 'mismatch' | 'unsupported' | 'unknown_pack';
  readonly question?: string;
  readonly detectedClass?: string;
  readonly expectedClass?: string;
  readonly note?: string;
}

export interface ReadBackSegment {
  readonly text: string;
  readonly kind: 'state' | 'rto' | 'series' | 'number' | 'prompt';
}

export interface ReadBackResult {
  readonly language: 'en' | 'hi' | 'te' | 'kn';
  readonly fullSpeech: string;
  readonly segments: readonly ReadBackSegment[];
  readonly confirmationPrompt: string;
}
