import React from 'react';
import { usePlan, type ScenarioId, type EventTypeKey } from '@state/index';
import type { Form35Decision, LicenceRouteDecision } from '@engine/model/types';
import { Container } from '@components/layout/Container';
import { Stack } from '@components/layout/Stack';
import { SegmentedControl } from '@components/ui/SegmentedControl';
import { Slider } from '@components/ui/Slider';
import { Button } from '@components/ui/Button';
import { Banner } from '@components/ui/Banner';
import { Timeline } from '@components/plan/Timeline';
import { LSDComparisonCards } from '@components/plan/LSDComparisonCards';
import { TaskDetailPanel } from '@components/plan/TaskDetailPanel';
import styles from './SimulatorPage.module.css';

const SCENARIO_OPTIONS = [
  {
    value: 'A' as ScenarioId,
    label: 'Scenario A: Hyderabad → Bengaluru',
    badge: 'Form 35 Open',
  },
  {
    value: 'B' as ScenarioId,
    label: 'Scenario B: Pune → Chennai',
    badge: 'BH-Series Car',
  },
  {
    value: 'C' as ScenarioId,
    label: 'Scenario C: Delhi → Gangtok',
    badge: 'Unknown State (SK)',
  },
];

const FORM35_OPTIONS = [
  {
    value: 'withdraw' as Form35Decision,
    label: 'Withdraw unilateral app',
    badge: 'Recommended',
  },
  {
    value: 'wait' as Form35Decision,
    label: 'Wait for unilateral processing',
    badge: 'Risk: Delays NOC',
  },
  {
    value: 'resolve' as Form35Decision,
    label: 'Resolve with bank consent',
    badge: 'Clean Path',
  },
];

const ROUTE_OPTIONS = [
  {
    value: 'rto-visit' as LicenceRouteDecision,
    label: 'Primary RTO Visit',
  },
  {
    value: 'another-rto' as LicenceRouteDecision,
    label: 'Alternative RTO (Fast Slot)',
  },
  {
    value: 'another-date' as LicenceRouteDecision,
    label: 'Post-Absence Slot',
  },
  {
    value: 'online' as LicenceRouteDecision,
    label: 'Aadhaar Online Renewal',
  },
];

const EVENT_BUTTONS: { key: EventTypeKey; label: string; desc: string }[] = [
  {
    key: 'slotCollapse',
    label: '⚡ RTO Slot Queue Delayed (+14d)',
    desc: 'Simulate unexpected slot congestion at destination RTO',
  },
  {
    key: 'tripExtended',
    label: '✈️ Absence Extended (+7d)',
    desc: 'Simulate business travel extension overlapping RTO appointment',
  },
  {
    key: 'formRejected',
    label: '🚫 Form 35 Application Rejected',
    desc: 'Simulate RTO objection to unilateral hypothecation removal',
  },
  {
    key: 'unknownJurisdiction',
    label: '⚠️ Unknown Jurisdiction (SK)',
    desc: 'Trigger degraded mode without state rulepack overrides',
  },
  {
    key: 'aadhaarEarly',
    label: '⚡ Aadhaar Address Early Auth',
    desc: 'Simulate fast-track UIDAI online address intimation',
  },
];

export const SimulatorPage: React.FC = () => {
  const {
    scenarioId,
    scenario,
    parameters,
    decisions,
    activeEvents,
    currentPlan,
    planDiff,
    optionsComparison,
    selectedTaskId,
    sources,
    setScenarioId,
    setParameter,
    setForm35Decision,
    setLicenceRouteDecision,
    toggleEvent,
    resetToScenarioDefaults,
    selectTask,
  } = usePlan();

  const isEventActive = (key: EventTypeKey) => activeEvents.some((e) => e.type === key);

  return (
    <div className={styles.page}>
      <Container size="xl">
        <Stack gap="6">
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTitleGroup}>
              <div className={styles.badgeRow}>
                <span className={styles.simulatedPill}>SIMULATED</span>
                <span className={styles.interactiveBadge}>Interactive Sandbox</span>
              </div>
              <h1 className={styles.pageTitle}>Plan Simulator & Curveball Engine</h1>
              <p className={styles.pageSubtitle}>
                Adjust operational constraints, test real-life curveball delays, toggle legal
                decisions, and observe instant ripple effects across the entire dependency graph.
              </p>
            </div>

            <Button variant="secondary" size="sm" onClick={resetToScenarioDefaults}>
              Reset Scenario Defaults
            </Button>
          </div>

          {/* Scenario Selector */}
          <div className={styles.controlBox}>
            <SegmentedControl
              label="Select Moving Scenario"
              value={scenarioId}
              onChange={setScenarioId}
              options={SCENARIO_OPTIONS}
            />
          </div>

          {/* Diff Banner if changes occurred */}
          {(planDiff.tasksAdded.length > 0 ||
            planDiff.tasksRemoved.length > 0 ||
            Object.keys(planDiff.startEndShifts).length > 0 ||
            planDiff.finishChange !== 0) && (
            <Banner
              variant="warning"
              title={`Simulation Diff: Finish shifted by ${
                planDiff.finishChange >= 0
                  ? `+${planDiff.finishChange} days`
                  : `${planDiff.finishChange} days`
              }`}
            >
              <div className={styles.diffSummary}>
                {planDiff.tasksAdded.length > 0 && (
                  <p>
                    <strong>Tasks Added:</strong> {planDiff.tasksAdded.join(', ')}
                  </p>
                )}
                {planDiff.tasksRemoved.length > 0 && (
                  <p>
                    <strong>Tasks Removed:</strong> {planDiff.tasksRemoved.join(', ')}
                  </p>
                )}
                {Object.keys(planDiff.startEndShifts).length > 0 && (
                  <p>
                    <strong>Schedule Shifts:</strong>{' '}
                    {Object.entries(planDiff.startEndShifts)
                      .map(
                        ([id, s]) =>
                          `${id} (${s.startDiff >= 0 ? `+${s.startDiff}` : s.startDiff}d)`
                      )
                      .join('; ')}
                  </p>
                )}
              </div>
            </Banner>
          )}

          {/* Simulation Controls Grid */}
          <div className={styles.controlsGrid}>
            {/* Parameters Column */}
            <div className={styles.controlColumn}>
              <h3 className={styles.columnHeading}>Operational Timings & Deadlines</h3>
              <div className={styles.controlsList}>
                <Slider
                  label="Primary RTO Slot Queue"
                  min={1}
                  max={45}
                  step={1}
                  unit=" days"
                  value={parameters.primarySlotQueue}
                  onChange={(val) => setParameter('primarySlotQueue', val)}
                  description="Days until earliest available appointment at destination RTO"
                />

                <Slider
                  label="Absence Window Start"
                  min={0}
                  max={30}
                  step={1}
                  unit=" (Day)"
                  value={parameters.absenceStart}
                  onChange={(val) => setParameter('absenceStart', val)}
                  description="Day citizen departs for scheduled travel"
                />

                <Slider
                  label="Absence Window End"
                  min={parameters.absenceStart + 1}
                  max={45}
                  step={1}
                  unit=" (Day)"
                  value={parameters.absenceEnd}
                  onChange={(val) => setParameter('absenceEnd', val)}
                  description="Day citizen returns from travel"
                />

                <Slider
                  label="NOC Processing Time"
                  min={3}
                  max={25}
                  step={1}
                  unit=" days"
                  value={parameters.nocProcessingDays}
                  onChange={(val) => setParameter('nocProcessingDays', val)}
                  description="Days taken by origin RTO to issue Form 28"
                />

                <Slider
                  label="Bank Hypothecation Consent (Form 28)"
                  min={2}
                  max={20}
                  step={1}
                  unit=" days"
                  value={parameters.bankConsentForm28Days}
                  onChange={(val) => setParameter('bankConsentForm28Days', val)}
                  description="Financier endorsement processing duration"
                />
              </div>
            </div>

            {/* Decisions & Curveballs Column */}
            <div className={styles.controlColumn}>
              <h3 className={styles.columnHeading}>Decisions & Curveball Events</h3>
              <div className={styles.controlsList}>
                {/* Form 35 Decision */}
                <div className={styles.decisionGroup}>
                  <span className={styles.controlLabel}>Form 35 Hypothecation Strategy</span>
                  <SegmentedControl
                    value={decisions.form35}
                    onChange={setForm35Decision}
                    options={FORM35_OPTIONS}
                    size="sm"
                  />
                  <p className={styles.decisionHint}>
                    Unilateral hypothecation removal causes legal hold at parent RTO, blocking NOC
                    until resolved or formal consent is produced.
                  </p>
                </div>

                {/* Licence Route Decision */}
                <div className={styles.decisionGroup}>
                  <span className={styles.controlLabel}>Licence Renewal Route</span>
                  <SegmentedControl
                    value={decisions.licenceRoute}
                    onChange={setLicenceRouteDecision}
                    options={ROUTE_OPTIONS}
                    size="sm"
                  />
                  <p className={styles.decisionHint}>
                    Changes in-person physical appointment requirements and test dependencies.
                  </p>
                </div>

                {/* Curveball Event Toggles */}
                <div className={styles.curveballsSection}>
                  <span className={styles.controlLabel}>Inject Real-Life Curveball Events</span>
                  <div className={styles.eventButtonsGrid}>
                    {EVENT_BUTTONS.map((evt) => {
                      const active = isEventActive(evt.key);
                      return (
                        <button
                          key={evt.key}
                          type="button"
                          className={`${styles.eventButton ?? ''} ${
                            active ? (styles.eventButtonActive ?? '') : ''
                          }`}
                          onClick={() => toggleEvent(evt.key)}
                          aria-pressed={active}
                        >
                          <span className={styles.eventBtnLabel}>{evt.label}</span>
                          <span className={styles.eventBtnDesc}>{evt.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dual Timeline / Visual Schedule */}
          <section aria-labelledby="sim-timeline-heading" className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <h2 id="sim-timeline-heading" className={styles.sectionTitle}>
                Updated Simulation Schedule
              </h2>
              <span className={styles.sectionMeta}>
                Simulated finish: <strong>Day {currentPlan.finish}</strong> • Critical Path:{' '}
                {currentPlan.criticalPath.length} tasks
              </span>
            </div>
            <Timeline
              tasks={currentPlan.tasks}
              absence={scenario.absence}
              primarySlotQueue={parameters.primarySlotQueue}
              selectedTaskId={selectedTaskId}
              onSelectTask={selectTask}
            />
          </section>

          {/* Option Comparison Cards */}
          <section aria-labelledby="sim-options-heading" className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <h2 id="sim-options-heading" className={styles.sectionTitle}>
                Real-Time Route Evaluation & Trade-Offs
              </h2>
              <span className={styles.sectionMeta}>
                Evaluated live under current simulation parameters and active events
              </span>
            </div>
            <LSDComparisonCards
              options={optionsComparison}
              currentDecision={decisions.licenceRoute}
              onSelectRoute={setLicenceRouteDecision}
            />
          </section>
        </Stack>
      </Container>

      {/* Task Detail Inspector */}
      <TaskDetailPanel
        plan={currentPlan}
        selectedTaskId={selectedTaskId}
        onClose={() => selectTask(null)}
        onSelectTask={selectTask}
        sources={sources}
      />
    </div>
  );
};
