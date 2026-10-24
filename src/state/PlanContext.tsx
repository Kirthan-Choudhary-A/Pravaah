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
} from '@engine/model/types';
import { planScenario } from '@engine/planner';
import { compareOptions } from '@engine/options/optionComparator';
import { diffPlans } from '@engine/options/diff';
import { applyEvent } from '@engine/options/events';
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

    // Announce plan updates
    const breaches = plan.checks.filter((c) => !c.passed).length;
    const announceMsg = `Scenario ${scenarioId} planned: ${plan.tasks.length} tasks scheduled, finishing on Day ${plan.finish}. ${
      breaches === 0 ? 'All modelled checks passed.' : `${breaches} modelled checks flagged.`
    }`;
    setAnnouncement(announceMsg);

    return plan;
  }, [effectiveScenario, rulePack, decisions, activeEvents, scenarioId]);

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

    setScenarioId: handleSetScenarioId,
    setForm35Decision: handleSetForm35Decision,
    setLicenceRouteDecision: handleSetLicenceRouteDecision,
    setAlternativeRTO: handleSetAlternativeRTO,
    setParameter: handleSetParameter,
    toggleEvent: handleToggleEvent,
    resetToScenarioDefaults: handleResetToScenarioDefaults,
    selectTask: setSelectedTaskId,
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
