import React from 'react';
import { usePlan } from '@state/index';
import { Banner } from '@components/ui/Banner';
import { Disclosure } from '@components/ui/Disclosure';
import { Timeline } from '@components/plan/Timeline';
import { DependencyGraph } from '@components/plan/DependencyGraph';
import { LSDComparisonCards } from '@components/plan/LSDComparisonCards';
import { LicenceStagesTable } from '@components/plan/LicenceStagesTable';
import { ChecksList } from '@components/plan/ChecksList';
import { FeesTable } from '@components/plan/FeesTable';
import { TaskDetailPanel } from '@components/plan/TaskDetailPanel';
import { PageHeader } from '@components/layout/PageHeader';
import styles from './PlannerPage.module.css';

export const PlannerPage: React.FC = () => {
  const {
    scenario,
    rulePack,
    sources,
    currentPlan,
    optionsComparison,
    decisions,
    selectedTaskId,
    isDegraded,
    setForm35Decision,
    setLicenceRouteDecision,
    selectTask,
  } = usePlan();

  return (
    <div className={styles.page}>
      <div className={styles.stack}>
        <PageHeader
          id="planner-heading"
          title="My plan"
          description={`${scenario.move.fromRTO} to ${scenario.move.toRTO}. Every step with the latest day you can start it. Day 0 is today.`}
        />

        {isDegraded && (
          <Banner variant="degraded" title="No rules for this state">
            <p>
              Pravaah has no rules for {scenario.move.toRTO}. Steps in that state are marked
              unknown. Check the state transport website before you act.
            </p>
          </Banner>
        )}

        <p className={styles.note}>
          Dates use assumed processing times, and the rules are not yet checked against official
          sources. Confirm with your RTO before you pay or travel.
        </p>

        <section aria-labelledby="timeline-heading" className={styles.section}>
          <h2 id="timeline-heading" className={styles.sectionTitle}>
            Steps in order
          </h2>
          <Timeline
            tasks={currentPlan.tasks}
            absence={scenario.absence}
            primarySlotQueue={scenario.primarySlotQueue}
            selectedTaskId={selectedTaskId}
            onSelectTask={selectTask}
          />
        </section>

        <section aria-labelledby="fees-heading" className={styles.section}>
          <FeesTable
            fees={currentPlan.fees}
            isDegraded={isDegraded}
            stateName={scenario.move.toState}
          />
        </section>

        <section aria-label="More detail" className={styles.details}>
          <Disclosure title="Compare ways to renew your licence">
            <LSDComparisonCards
              options={optionsComparison}
              current={decisions}
              limit={3}
              onSelect={(d) => {
                setForm35Decision(d.form35);
                setLicenceRouteDecision(d.licenceRoute);
              }}
            />
          </Disclosure>
          <Disclosure title="Why each step comes before another">
            <DependencyGraph
              tasks={currentPlan.tasks}
              links={currentPlan.links}
              selectedTaskId={selectedTaskId}
              onSelectTask={selectTask}
            />
          </Disclosure>
          <Disclosure title="Late fees and renewal stages">
            <LicenceStagesTable pack={rulePack} expiryDay={scenario.licenceExpiryDay} />
          </Disclosure>
          <Disclosure title="Rule checks">
            <ChecksList checks={currentPlan.checks} />
          </Disclosure>
        </section>
      </div>

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
