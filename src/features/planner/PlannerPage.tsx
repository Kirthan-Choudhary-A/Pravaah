import React from 'react';
import { usePlan } from '@state/index';
import { Container } from '@components/layout/Container';
import { Stack } from '@components/layout/Stack';
import { Banner } from '@components/ui/Banner';
import { Timeline } from '@components/plan/Timeline';
import { DependencyGraph } from '@components/plan/DependencyGraph';
import { LSDComparisonCards } from '@components/plan/LSDComparisonCards';
import { LicenceStagesTable } from '@components/plan/LicenceStagesTable';
import { ChecksList } from '@components/plan/ChecksList';
import { FeesTable } from '@components/plan/FeesTable';
import { TaskDetailPanel } from '@components/plan/TaskDetailPanel';
import styles from './PlannerPage.module.css';

export const PlannerPage: React.FC = () => {
  const {
    scenarioId,
    scenario,
    rulePack,
    sources,
    currentPlan,
    optionsComparison,
    decisions,
    selectedTaskId,
    isDegraded,
    setLicenceRouteDecision,
    selectTask,
  } = usePlan();

  const passedChecks = currentPlan.checks.filter((c) => c.passed).length;

  return (
    <div className={styles.page}>
      <Container size="xl">
        <Stack gap="6">
          {/* Header & Scenario Summary Strip */}
          <section className={styles.summaryStrip} aria-labelledby="planner-heading">
            <div className={styles.summaryTopRow}>
              <div>
                <div className={styles.badgeRow}>
                  <span className={styles.simulatedPill}>SIMULATED</span>
                  <span className={styles.scenarioBadge}>Scenario {scenarioId}</span>
                  {isDegraded && <span className={styles.degradedBadge}>DEGRADED MODE</span>}
                </div>
                <h1 id="planner-heading" className={styles.pageTitle}>
                  Planner — {scenario.name}
                </h1>
                <p className={styles.moveDescription}>
                  Move: {scenario.move.fromRTO} ({scenario.move.fromState}) ──▶{' '}
                  {scenario.move.toRTO} ({scenario.move.toState}) • Vehicle:{' '}
                  {scenario.move.vehicleType} {scenario.move.isBHSeries ? '(BH Series)' : ''}
                </p>
              </div>

              <div className={styles.quickMetrics}>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Total Duration</span>
                  <span className={styles.metricValue}>Day {currentPlan.finish}</span>
                  <span className={styles.metricSub}>Estimated Finish</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Tasks</span>
                  <span className={styles.metricValue}>{currentPlan.tasks.length}</span>
                  <span className={styles.metricSub}>Scheduled</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Compliance</span>
                  <span className={styles.metricValue}>
                    {passedChecks}/{currentPlan.checks.length}
                  </span>
                  <span className={styles.metricSub}>Checks Passed</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricLabel}>Selected Route</span>
                  <span className={styles.metricValue}>{decisions.licenceRoute}</span>
                  <span className={styles.metricSub}>Statutory Path</span>
                </div>
              </div>
            </div>
          </section>

          {/* Degraded Mode Banner */}
          {isDegraded && (
            <Banner
              variant="degraded"
              title={`Degraded Mode Active: Destination State (${scenario.move.toState}) Rules Unknown`}
            >
              <p>
                No verified state rule pack is registered for {scenario.move.toState}. Central MV
                Act defaults apply, but state-specific fees, road tax, and local procedures cannot
                be modelled without confirmation.
              </p>
              <p>
                <strong>Rules unknown – confirm with the local RTO.</strong> Official fee amounts
                are suppressed to prevent misinformation.
              </p>
            </Banner>
          )}

          {/* Timeline View */}
          <section aria-labelledby="timeline-heading" className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <h2 id="timeline-heading" className={styles.sectionTitle}>
                Unified Schedule & Critical Path
              </h2>
              <span className={styles.sectionMeta}>
                Day 0 is Today. Time intervals shown as half-open [start, end).
              </span>
            </div>
            <Timeline
              tasks={currentPlan.tasks}
              absence={scenario.absence}
              primarySlotQueue={scenario.primarySlotQueue}
              selectedTaskId={selectedTaskId}
              onSelectTask={selectTask}
            />
          </section>

          {/* Dependency Graph */}
          <section aria-labelledby="graph-heading" className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <h2 id="graph-heading" className={styles.sectionTitle}>
                Dependency Graph & Consequence Propagation
              </h2>
              <span className={styles.sectionMeta}>
                Layered DAG ordered by dependency depth. Click any node to inspect upstream needs
                and downstream consequences.
              </span>
            </div>
            <DependencyGraph
              tasks={currentPlan.tasks}
              links={currentPlan.links}
              selectedTaskId={selectedTaskId}
              onSelectTask={selectTask}
            />
          </section>

          {/* Route Options Comparison */}
          <section aria-labelledby="routes-heading" className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <h2 id="routes-heading" className={styles.sectionTitle}>
                Statutory Licence Renewal Route Options
              </h2>
              <span className={styles.sectionMeta}>
                Comparing all legally permissible options under Central and State Motor Vehicle
                Rules
              </span>
            </div>
            <LSDComparisonCards
              options={optionsComparison}
              currentDecision={decisions.licenceRoute}
              onSelectRoute={setLicenceRouteDecision}
            />
          </section>

          {/* Licence Stages Table */}
          <section aria-labelledby="stages-heading" className={styles.sectionContainer}>
            <LicenceStagesTable pack={rulePack} expiryDay={scenario.licenceExpiryDay} />
          </section>

          {/* Compliance & Checks */}
          <section aria-labelledby="compliance-heading" className={styles.sectionContainer}>
            <ChecksList checks={currentPlan.checks} />
          </section>

          {/* Fees Breakdown */}
          <section aria-labelledby="fees-heading" className={styles.sectionContainer}>
            <FeesTable
              fees={currentPlan.fees}
              isDegraded={isDegraded}
              stateName={scenario.move.toState}
            />
          </section>
        </Stack>
      </Container>

      {/* Task Detail Inspector Dialog / Slide-out */}
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
