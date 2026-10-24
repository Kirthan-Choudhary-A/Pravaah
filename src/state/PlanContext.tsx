import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useSearchParams } from 'react-router-dom';
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
  PlanInput,
  HouseholdVehicle,
  Consent,
  ConsentScope,
  AuditEntry,
  RevealResult,
} from '@engine/model/types';
import { planScenario } from '@engine/planner';
import { compareOptions } from '@engine/options/optionComparator';
import { diffPlans } from '@engine/options/diff';
import { applyEvent } from '@engine/options/events';
import {
  createConsentRequest,
  grantConsent,
  declineConsent,
  revokeConsent,
  reveal,
  appendAudit,
  planHousehold,
} from '@engine';
import { loadScenario, loadMergedRulePack, loadSources } from '@data/index';
import type { ScenarioId, SimulatorParameters, EventTypeKey, PlanContextValue } from './types';

const PlanContext = createContext<PlanContextValue | null>(null);

const DEFAULT_SCENARIO_ID: ScenarioId = 'A';

const EVENT_FACTORIES: Record<EventTypeKey, PlanningEvent> = {
  slotCollapse: { type: 'slotCollapse', queueDays: 28 },
  tripExtended: { type: 'tripExtended', additionalDays: 7 },
  unknownJurisdiction: { type: 'unknownJurisdiction', targetState: 'SK' },
  formRejected: { type: 'formRejected', day: 10 },
  aadhaarEarly: { type: 'aadhaarEarly', day: 4 },
};

const INITIAL_HOUSEHOLD_VEHICLES: readonly HouseholdVehicle[] = [
  {
    id: 'veh-you-1',
    plate: 'TS-09-EB-4471',
    vehicleType: 'Car',
    ownerRole: 'You',
    renewalItems: [],
    chassisDemo: 'DEMO-CHAS-994471',
    engineDemo: 'DEMO-ENG-884471',
  },
  {
    id: 'veh-family-1',
    plate: 'KA-03-MJ-4578',
    vehicleType: 'Two-Wheeler',
    ownerRole: 'Family member',
    renewalItems: [
      {
        id: 'item-puc-1',
        name: 'PUC Certificate Renewal',
        dueDate: 30,
        duration: 1,
        basis: 'statute',
        verified: false,
        why: 'PUC valid for 6 months under CMVR Rule 115',
      },
      {
        id: 'item-ins-1',
        name: 'Motor Third-Party Insurance',
        dueDate: 90,
        duration: 1,
        basis: 'statute',
        verified: false,
        why: 'Mandatory motor third party insurance under Section 146 MV Act',
      },
    ],
    aadhaarDemo: 'DEMO-0000-1234',
    dlDemo: 'KA-03-2018-0004578',
    chassisDemo: 'DEMO-CHAS-114578',
    engineDemo: 'DEMO-ENG-224578',
    challansDemo: [{ id: 'ch-01', amount: 500, location: 'MG Road, Bengaluru' }],
  },
];

const INITIAL_CONSENTS: readonly Consent[] = [
  {
    id: 'consent-seed-1',
    grantorRole: 'Family member',
    granteeRole: 'You',
    vehicleIds: ['veh-family-1', 'KA-03-MJ-4578'],
    scopes: ['view'],
    until: 1800000000000,
    status: 'granted',
  },
];

const INITIAL_AUDIT_LOG: readonly AuditEntry[] = [
  {
    id: 'audit-seed-1',
    at: 1700000000000,
    actor: 'Family member',
    subject: 'You',
    field: 'consent',
    action: 'grant',
    purpose: 'Initial demo consent granted for KA-03-MJ-4578',
    result: 'allowed',
  },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // ignore
  }
}

function parseScenarioId(val: string | null): ScenarioId {
  if (val === 'B' || val === 'b') return 'B';
  if (val === 'C' || val === 'c') return 'C';
  return DEFAULT_SCENARIO_ID;
}

function parseRouteDecision(val: string | null): LicenceRouteDecision {
  if (val === 'online' || val === 'rto-visit' || val === 'another-rto' || val === 'another-date') {
    return val;
  }
  return 'rto-visit';
}

function parseForm35Decision(val: string | null): Form35Decision {
  if (val === 'wait' || val === 'withdraw' || val === 'resolve') {
    return val;
  }
  return 'withdraw';
}

function parseEvents(val: string | null): PlanningEvent[] {
  if (!val) return [];
  const keys = val.split(',').map((s) => s.trim()) as EventTypeKey[];
  const result: PlanningEvent[] = [];
  for (const k of keys) {
    if (EVENT_FACTORIES[k]) {
      result.push(EVENT_FACTORIES[k]);
    }
  }
  return result;
}

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Load static data
  const sources = useMemo<readonly SourceEntry[]>(() => loadSources(), []);

  // Initialize from URL or defaults
  const [scenarioId, setScenarioIdState] = useState<ScenarioId>(() =>
    parseScenarioId(searchParams.get('scenario'))
  );

  const baseScenario = useMemo<Scenario>(() => loadScenario(scenarioId), [scenarioId]);

  // Customizable parameters
  const [parameters, setParameters] = useState<SimulatorParameters>(() => ({
    primarySlotQueue: baseScenario.primarySlotQueue,
    absenceStart: baseScenario.absence.start,
    absenceEnd: baseScenario.absence.end,
    nocProcessingDays: baseScenario.timings.nocProcessingDays,
    bankConsentForm28Days: baseScenario.timings.bankConsentForm28Days,
  }));

  // Reset parameters when scenario changes
  useEffect(() => {
    setParameters({
      primarySlotQueue: baseScenario.primarySlotQueue,
      absenceStart: baseScenario.absence.start,
      absenceEnd: baseScenario.absence.end,
      nocProcessingDays: baseScenario.timings.nocProcessingDays,
      bankConsentForm28Days: baseScenario.timings.bankConsentForm28Days,
    });
  }, [baseScenario]);

  // Decisions
  const [decisions, setDecisions] = useState<Decisions>(() => ({
    form35: parseForm35Decision(searchParams.get('form35')),
    licenceRoute: parseRouteDecision(searchParams.get('route')),
  }));

  // Active Events
  const [activeEvents, setActiveEvents] = useState<readonly PlanningEvent[]>(() =>
    parseEvents(searchParams.get('events'))
  );

  // Inspector selection
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Announcement for accessibility
  const [announcement, setAnnouncement] = useState<string>('');

  // Household & Privacy State
  const [householdVehicles, setHouseholdVehicles] = useState<readonly HouseholdVehicle[]>(() =>
    loadFromStorage('pravaah_household_vehicles', INITIAL_HOUSEHOLD_VEHICLES)
  );

  const [consents, setConsents] = useState<readonly Consent[]>(() =>
    loadFromStorage('pravaah_consents', INITIAL_CONSENTS)
  );

  const [auditLog, setAuditLog] = useState<readonly AuditEntry[]>(() =>
    loadFromStorage('pravaah_audit_log', INITIAL_AUDIT_LOG)
  );

  const [activeRole, setActiveRole] = useState<'You' | 'Family member'>('You');

  const [revealedFields, setRevealedFields] = useState<
    Record<string, { readonly value: string; readonly expiresAt: number }>
  >({});

  // Auto-expire revealed fields
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRevealedFields((prev) => {
        let changed = false;
        const next: Record<string, { readonly value: string; readonly expiresAt: number }> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v.expiresAt > now) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keep track of previous plan for diffing
  const previousPlanRef = useRef<PlanResult | null>(null);

  // Synchronize state back to URL
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.set('scenario', scenarioId);
    newParams.set('route', decisions.licenceRoute);
    newParams.set('form35', decisions.form35);

    if (activeEvents.length > 0) {
      const eventKeys = activeEvents.map((e) => e.type);
      newParams.set('events', eventKeys.join(','));
    } else {
      newParams.delete('events');
    }

    setSearchParams(newParams, { replace: true });
  }, [scenarioId, decisions, activeEvents, setSearchParams, searchParams]);

  // Construct active scenario with parameter overrides
  const effectiveScenario = useMemo<Scenario>(() => {
    return {
      ...baseScenario,
      primarySlotQueue: parameters.primarySlotQueue,
      absence: {
        start: parameters.absenceStart,
        end: parameters.absenceEnd,
      },
      timings: {
        nocProcessingDays: parameters.nocProcessingDays,
        bankConsentForm28Days: parameters.bankConsentForm28Days,
      },
    };
  }, [baseScenario, parameters]);

  // Merged rule pack
  const rulePack = useMemo<RulePack>(
    () => loadMergedRulePack(effectiveScenario.move.toState),
    [effectiveScenario.move.toState]
  );

  // Compute Current Plan
  const currentPlan = useMemo<PlanResult>(() => {
    let input: PlanInput = {
      scenario: effectiveScenario,
      mergedPack: rulePack,
      decisions,
      events: activeEvents,
    };

    // Apply any simulation events sequentially
    for (const evt of activeEvents) {
      input = applyEvent(input, evt);
    }

    const plan = planScenario(input);

    // If active consent has 'view' scope for family member's vehicle, add household tasks
    const activeViewConsent = consents.find(
      (c) => c.status === 'granted' && c.scopes.includes('view')
    );

    let combinedTasks = plan.tasks;
    if (activeViewConsent) {
      const familyVehicles = householdVehicles.filter((v) => v.ownerRole === 'Family member');
      const householdTasks = planHousehold({
        householdVehicles: familyVehicles,
        consents,
        now: 0,
        pack: rulePack,
      });

      if (householdTasks.length > 0) {
        combinedTasks = [...plan.tasks, ...householdTasks];
      }
    }

    const finalPlan: PlanResult = {
      ...plan,
      tasks: combinedTasks,
    };

    // Announce plan updates
    const breaches = finalPlan.checks.filter((c) => !c.passed).length;
    const announceMsg = `Scenario ${scenarioId} planned: ${finalPlan.tasks.length} tasks scheduled, finishing on Day ${finalPlan.finish}. ${
      breaches === 0 ? 'All modelled checks passed.' : `${breaches} modelled checks flagged.`
    }`;
    setAnnouncement(announceMsg);

    return finalPlan;
  }, [effectiveScenario, rulePack, decisions, activeEvents, scenarioId, consents, householdVehicles]);

  // Options comparison
  const optionsComparison = useMemo<readonly OptionComparison[]>(() => {
    let input: PlanInput = {
      scenario: effectiveScenario,
      mergedPack: rulePack,
      decisions,
      events: activeEvents,
    };

    for (const evt of activeEvents) {
      input = applyEvent(input, evt);
    }

    return compareOptions(input);
  }, [effectiveScenario, rulePack, decisions, activeEvents]);

  // Diff calculation
  const planDiff = useMemo<Diff>(() => {
    const prev = previousPlanRef.current ?? currentPlan;
    return diffPlans(prev, currentPlan);
  }, [currentPlan]);

  // Update previous plan ref after render cycle
  useEffect(() => {
    previousPlanRef.current = currentPlan;
  }, [currentPlan]);

  // Handlers
  const handleSetScenarioId = useCallback((id: ScenarioId) => {
    setScenarioIdState(id);
    setSelectedTaskId(null);
  }, []);

  const handleSetForm35Decision = useCallback((decision: Form35Decision) => {
    setDecisions((prev) => ({ ...prev, form35: decision }));
  }, []);

  const handleSetLicenceRouteDecision = useCallback((decision: LicenceRouteDecision) => {
    setDecisions((prev) => ({ ...prev, licenceRoute: decision }));
  }, []);

  const handleSetAlternativeRTO = useCallback((rto: string) => {
    setDecisions((prev) => ({ ...prev, alternativeRTO: rto }));
  }, []);

  const handleSetParameter = useCallback(
    <K extends keyof SimulatorParameters>(key: K, value: SimulatorParameters[K]) => {
      setParameters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleToggleEvent = useCallback((eventKey: EventTypeKey) => {
    setActiveEvents((prev) => {
      const exists = prev.some((e) => e.type === eventKey);
      if (exists) {
        return prev.filter((e) => e.type !== eventKey);
      }
      return [...prev, EVENT_FACTORIES[eventKey]];
    });
  }, []);

  const handleResetToScenarioDefaults = useCallback(() => {
    setParameters({
      primarySlotQueue: baseScenario.primarySlotQueue,
      absenceStart: baseScenario.absence.start,
      absenceEnd: baseScenario.absence.end,
      nocProcessingDays: baseScenario.timings.nocProcessingDays,
      bankConsentForm28Days: baseScenario.timings.bankConsentForm28Days,
    });
    setDecisions({
      form35: baseScenario.blockers.form35Open ? 'withdraw' : 'wait',
      licenceRoute: 'rto-visit',
    });
    setActiveEvents([]);
    setSelectedTaskId(null);
  }, [baseScenario]);

  // Household & Privacy Actions
  const handleRequestConsent = useCallback(
    (params: {
      grantorRole: string;
      vehicleIds: string[];
      scopes: ConsentScope[];
      days?: number;
    }) => {
      const now = Date.now();
      const until = now + (params.days ?? 30) * 86400000;
      const res = createConsentRequest({
        id: `consent-${Date.now()}`,
        grantorRole: params.grantorRole,
        granteeRole: activeRole,
        vehicleIds: params.vehicleIds,
        scopes: params.scopes,
        until,
        now,
      });

      if (!res.ok) {
        return { ok: false, error: res.error };
      }

      setConsents((prev) => {
        const next = [...prev, res.consent];
        saveToStorage('pravaah_consents', next);
        return next;
      });

      if (res.auditEntry) {
        setAuditLog((prev) => {
          const next = appendAudit(prev, res.auditEntry);
          saveToStorage('pravaah_audit_log', next);
          return next;
        });
      }

      return { ok: true };
    },
    [activeRole]
  );

  const handleGrantConsentAction = useCallback(
    (consentId: string, updatedScopes?: ConsentScope[]) => {
      const target = consents.find((c) => c.id === consentId);
      if (!target) return { ok: false, error: 'Consent request not found.' };

      const now = Date.now();
      const res = grantConsent(target, now, updatedScopes);
      if (!res.ok) return { ok: false, error: res.error };

      setConsents((prev) => {
        const next = prev.map((c) => (c.id === consentId ? res.consent : c));
        saveToStorage('pravaah_consents', next);
        return next;
      });

      if (res.auditEntry) {
        setAuditLog((prev) => {
          const next = appendAudit(prev, res.auditEntry);
          saveToStorage('pravaah_audit_log', next);
          return next;
        });
      }

      return { ok: true };
    },
    [consents]
  );

  const handleDeclineConsentAction = useCallback(
    (consentId: string) => {
      const target = consents.find((c) => c.id === consentId);
      if (!target) return { ok: false, error: 'Consent request not found.' };

      const now = Date.now();
      const res = declineConsent(target, now);
      if (!res.ok) return { ok: false, error: res.error };

      setConsents((prev) => {
        const next = prev.map((c) => (c.id === consentId ? res.consent : c));
        saveToStorage('pravaah_consents', next);
        return next;
      });

      if (res.auditEntry) {
        setAuditLog((prev) => {
          const next = appendAudit(prev, res.auditEntry);
          saveToStorage('pravaah_audit_log', next);
          return next;
        });
      }

      return { ok: true };
    },
    [consents]
  );

  const handleRevokeConsentAction = useCallback(
    (consentId: string) => {
      const target = consents.find((c) => c.id === consentId);
      if (!target) return { ok: false, error: 'Consent request not found.' };

      const now = Date.now();
      const res = revokeConsent(target, now);
      if (!res.ok) return { ok: false, error: res.error };

      setConsents((prev) => {
        const next = prev.map((c) => (c.id === consentId ? res.consent : c));
        saveToStorage('pravaah_consents', next);
        return next;
      });

      if (res.auditEntry) {
        setAuditLog((prev) => {
          const next = appendAudit(prev, res.auditEntry);
          saveToStorage('pravaah_audit_log', next);
          return next;
        });
      }

      return { ok: true };
    },
    [consents]
  );

  const handleRevealFieldAction = useCallback(
    (params: {
      field: string;
      rawValue: string;
      purpose: string;
      consentId?: string;
    }): RevealResult => {
      const activeConsent =
        (params.consentId ? consents.find((c) => c.id === params.consentId) : null) ||
        consents.find((c) => c.status === 'granted') ||
        null;

      const now = Date.now();
      const res = reveal({
        field: params.field,
        purpose: params.purpose,
        actor: activeRole,
        consent: activeConsent,
        rawValue: params.rawValue,
        now,
        durationSeconds: 60,
      });

      if (res.ok) {
        const fieldKey = `${params.field}-${params.rawValue}`;
        setRevealedFields((prev) => ({
          ...prev,
          [fieldKey]: { value: res.value, expiresAt: res.expiresAt },
        }));

        setAuditLog((prev) => {
          const next = appendAudit(prev, res.auditEntry);
          saveToStorage('pravaah_audit_log', next);
          return next;
        });
      }

      return res;
    },
    [consents, activeRole]
  );

  const handleHideFieldAction = useCallback((field: string) => {
    setRevealedFields((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k.startsWith(field)) {
          delete next[k];
        }
      }
      return next;
    });
  }, []);

  const handleAddVehicleAction = useCallback((vehicle: HouseholdVehicle) => {
    setHouseholdVehicles((prev) => {
      const next = [...prev, vehicle];
      saveToStorage('pravaah_household_vehicles', next);
      return next;
    });
  }, []);

  const handleClearAuditLogAction = useCallback(() => {
    setAuditLog([]);
    saveToStorage('pravaah_audit_log', []);
  }, []);

  const handleResetDemoAction = useCallback(() => {
    try {
      localStorage.removeItem('pravaah_household_vehicles');
      localStorage.removeItem('pravaah_consents');
      localStorage.removeItem('pravaah_audit_log');
    } catch {
      // ignore
    }
    setHouseholdVehicles(INITIAL_HOUSEHOLD_VEHICLES);
    setConsents(INITIAL_CONSENTS);
    setAuditLog(INITIAL_AUDIT_LOG);
    setRevealedFields({});
    setActiveRole('You');
    handleResetToScenarioDefaults();
    setSearchParams({ scenario: 'A' });
    setAnnouncement('Demo reset to Scenario A defaults. Consents and audit log cleared.');
  }, [handleResetToScenarioDefaults, setSearchParams]);

  useEffect(() => {
    const handleResetEvent = () => {
      handleResetDemoAction();
    };
    window.addEventListener('pravaah:reset-demo', handleResetEvent);
    return () => window.removeEventListener('pravaah:reset-demo', handleResetEvent);
  }, [handleResetDemoAction]);

  const value: PlanContextValue = {
    scenarioId,
    scenario: effectiveScenario,
    rulePack,
    sources,
    parameters,
    decisions,
    activeEvents,
    currentPlan,
    previousPlan: previousPlanRef.current,
    planDiff,
    optionsComparison,
    selectedTaskId,
    isDegraded: currentPlan.degradedMode,
    announcement,

    // Household & Privacy State
    householdVehicles,
    consents,
    auditLog,
    activeRole,
    revealedFields,

    setScenarioId: handleSetScenarioId,
    setForm35Decision: handleSetForm35Decision,
    setLicenceRouteDecision: handleSetLicenceRouteDecision,
    setAlternativeRTO: handleSetAlternativeRTO,
    setParameter: handleSetParameter,
    toggleEvent: handleToggleEvent,
    resetToScenarioDefaults: handleResetToScenarioDefaults,
    selectTask: setSelectedTaskId,

    // Household & Privacy Actions
    setActiveRole,
    requestConsent: handleRequestConsent,
    grantConsentAction: handleGrantConsentAction,
    declineConsentAction: handleDeclineConsentAction,
    revokeConsentAction: handleRevokeConsentAction,
    revealFieldAction: handleRevealFieldAction,
    hideFieldAction: handleHideFieldAction,
    addVehicleAction: handleAddVehicleAction,
    clearAuditLogAction: handleClearAuditLogAction,
    resetDemoAction: handleResetDemoAction,
  };

  return (
    <PlanContext.Provider value={value}>
      {/* Invisible live region for screen-reader accessibility */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          border: 0,
        }}
      >
        {announcement}
      </div>
      {children}
    </PlanContext.Provider>
  );
};

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
