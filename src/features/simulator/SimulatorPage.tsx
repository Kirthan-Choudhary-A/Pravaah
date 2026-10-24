import React from 'react';
import { usePlan, type EventTypeKey } from '@state/index';
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
import { PageHeader } from '@components/layout/PageHeader';
import styles from './SimulatorPage.module.css';

const FORM35_OPTIONS = [
  {
    value: 'withdraw' as Form35Decision,
    label: 'Withdraw Form 35',
  },
  {
    value: 'wait' as Form35Decision,
    label: 'Wait for the RTO',
  },
  {
    value: 'resolve' as Form35Decision,
    label: 'Resolve via grievance',
  },
];

const ROUTE_OPTIONS = [
  {
    value: 'rto-visit' as LicenceRouteDecision,
    label: 'At the RTO',
  },
  {
    value: 'another-rto' as LicenceRouteDecision,
    label: 'Another RTO',
  },
  {
    value: 'another-date' as LicenceRouteDecision,
    label: 'After my trip',
  },
  {
    value: 'online' as LicenceRouteDecision,
    label: 'Online with Aadhaar',
  },
];

const EVENT_BUTTONS: { key: EventTypeKey; label: string; desc: string }[] = [
  {
    key: 'slotCollapse',
    label: 'RTO slot queue delayed (+14 days)',
    desc: 'Appointments are harder to get',
  },
  {
    key: 'tripExtended',
    label: 'Trip extended (+7 days)',
    desc: 'You are away longer',
  },
  {
    key: 'formRejected',
    label: 'Form 35 rejected',
    desc: 'The loan record request is refused',
  },
  {
    key: 'unknownJurisdiction',
    label: 'Move to a state with no rules',
    desc: 'Pravaah has no rules for it',
  },
  {
    key: 'aadhaarEarly',
    label: 'Aadhaar address updated early',
    desc: 'Before the NOC is issued',
  },
];

export const SimulatorPage: React.FC = () => {
  const {
    scenario,
    parameters,
    decisions,
    activeEvents,
    currentPlan,
    planDiff,
    optionsComparison,
    selectedTaskId,
    sources,
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
          <PageHeader
            title="What if something changes?"
            description="Change a delay or a decision and see how your plan moves."
            actions={
              <Button variant="secondary" size="sm" onClick={resetToScenarioDefaults}>
                Start again
              </Button>
            }
          />

          {/* Diff Banner if changes occurred */}
          {(planDiff.tasksAdded.length > 0 ||
            planDiff.tasksRemoved.length > 0 ||
            Object.keys(planDiff.startEndShifts).length > 0 ||
            planDiff.finishChange !== 0) && (
            <Banner
              variant="warning"
              title={`Your plan now finishes ${Math.abs(planDiff.finishChange)} days ${
                planDiff.finishChange >= 0 ? 'later' : 'earlier'
              }`}
            >
              <div className={styles.diffSummary}>
                {planDiff.tasksAdded.length > 0 && (
                  <p>
                    <strong>Added:</strong> {planDiff.tasksAdded.join(', ')}
                  </p>
                )}
                {planDiff.tasksRemoved.length > 0 && (
                  <p>
                    <strong>Removed:</strong> {planDiff.tasksRemoved.join(', ')}
                  </p>
                )}
                {Object.keys(planDiff.startEndShifts).length > 0 && (
                  <p>
                    <strong>Moved:</strong>{' '}
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
              <h3 className={styles.columnHeading}>Timings</h3>
              <div className={styles.controlsList}>
                <Slider
                  label="Wait for an RTO appointment"
                  min={1}
                  max={45}
                  step={1}
                  unit=" days"
                  value={parameters.primarySlotQueue}
                  onChange={(val) => setParameter('primarySlotQueue', val)}
                  description="Days until the first free slot"
                />

                <Slider
                  label="You leave on day"
                  min={0}
                  max={30}
                  step={1}
                  unit=" (Day)"
                  value={parameters.absenceStart}
                  onChange={(val) => setParameter('absenceStart', val)}
                  description="First day you are away"
                />

                <Slider
                  label="You return on day"
                  min={parameters.absenceStart + 1}
                  max={45}
                  step={1}
                  unit=" (Day)"
                  value={parameters.absenceEnd}
                  onChange={(val) => setParameter('absenceEnd', val)}
                  description="First day you are back"
                />

                <Slider
                  label="NOC takes"
                  min={3}
                  max={25}
                  step={1}
                  unit=" days"
                  value={parameters.nocProcessingDays}
                  onChange={(val) => setParameter('nocProcessingDays', val)}
                  description="Days for the old RTO to issue it"
                />

                <Slider
                  label="Bank consent takes"
                  min={2}
                  max={20}
                  step={1}
                  unit=" days"
                  value={parameters.bankConsentForm28Days}
                  onChange={(val) => setParameter('bankConsentForm28Days', val)}
                  description="Days for the bank to sign"
                />
              </div>
            </div>

            {/* Decisions & Curveballs Column */}
            <div className={styles.controlColumn}>
              <h3 className={styles.columnHeading}>Choices and changes</h3>
              <div className={styles.controlsList}>
                {/* Form 35 Decision */}
                <div className={styles.decisionGroup}>
                  <span className={styles.controlLabel}>Loan record (Form 35)</span>
                  <SegmentedControl
                    value={decisions.form35}
                    onChange={setForm35Decision}
                    options={FORM35_OPTIONS}
                    size="sm"
                  />
                </div>

                {/* Licence Route Decision */}
                <div className={styles.decisionGroup}>
                  <span className={styles.controlLabel}>How to renew your licence</span>
                  <SegmentedControl
                    value={decisions.licenceRoute}
                    onChange={setLicenceRouteDecision}
                    options={ROUTE_OPTIONS}
                    size="sm"
                  />
                </div>

                {/* Curveball Event Toggles */}
                <div className={styles.curveballsSection}>
                  <span className={styles.controlLabel}>Try a change</span>
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
                Updated steps
              </h2>
              <span className={styles.sectionMeta}>
                Everything done by <strong>day {currentPlan.finish}</strong>
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
                Ways to renew compared
              </h2>
            </div>
            <LSDComparisonCards
              options={optionsComparison}
              current={decisions}
              limit={3}
              onSelect={(d) => {
                setForm35Decision(d.form35);
                setLicenceRouteDecision(d.licenceRoute);
              }}
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
