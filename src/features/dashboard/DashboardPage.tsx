import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlan } from '@state/PlanContext';
import { evaluateConsentStatus } from '@engine';
import type { ScheduledTask } from '@engine/model/types';
import { PageHeader } from '@components/layout/PageHeader';
import { Runway } from '@components/plan/Runway';
import { StatusTag } from '@components/ui/StatusTag';
import { Banner } from '@components/ui/Banner';
import { Button } from '@components/ui/Button';
import { nowSeconds } from '../../utils/clock';
import styles from './DashboardPage.module.css';

const SEVERITY: Record<string, number> = { Missed: 0, 'At risk': 1, Unknown: 2, Safe: 3 };

const ROUTE_TEXT = {
  online: 'online Aadhaar renewal',
  'rto-visit': 'an RTO visit',
  'another-rto': 'another RTO',
  'another-date': 'a later RTO visit',
} as const;

const FORM35_TEXT = {
  resolve: 'resolve Form 35 by grievance',
  withdraw: 'withdraw Form 35',
  wait: 'wait for Form 35',
} as const;

export const DashboardPage: React.FC = () => {
  const {
    scenario,
    currentPlan,
    decisions,
    optionsComparison,
    isDegraded,
    householdVehicles,
    consents,
    selectTask,
    setForm35Decision,
    setLicenceRouteDecision,
  } = usePlan();
  const navigate = useNavigate();

  const renewal = currentPlan.tasks.find((t) => t.id === 'task-licence-renewal') ?? null;
  const best = optionsComparison[0];
  const onBest =
    !best ||
    (best.decisions.form35 === decisions.form35 &&
      best.decisions.licenceRoute === decisions.licenceRoute);

  const attention = useMemo(
    () =>
      currentPlan.tasks
        .filter((t) => t.status === 'Missed' || t.status === 'At risk')
        .sort((a, b) => (SEVERITY[a.status] ?? 9) - (SEVERITY[b.status] ?? 9) || a.slack - b.slack)
        .slice(0, 5),
    [currentPlan.tasks]
  );
  const failedChecks = currentPlan.checks.filter((c) => !c.passed);
  const nextUp = useMemo(
    () => [...currentPlan.tasks].sort((a, b) => a.start - b.start || a.end - b.end).slice(0, 5),
    [currentPlan.tasks]
  );

  const now = nowSeconds();
  const sharedWithYou = consents.filter(
    (c) => c.granteeRole === 'You' && evaluateConsentStatus(c, now) === 'granted'
  ).length;
  const passed = currentPlan.checks.length - failedChecks.length;

  const openTask = (task: ScheduledTask) => {
    selectTask(task.id);
    navigate('/plan');
  };

  const applyBest = () => {
    if (!best) return;
    setForm35Decision(best.decisions.form35);
    setLicenceRouteDecision(best.decisions.licenceRoute);
  };

  const blockers = [
    scenario.blockers.form35Open && !scenario.move.isBHSeries ? 'an open Form 35' : null,
    scenario.blockers.unpaidChallansCount > 0
      ? `${scenario.blockers.unpaidChallansCount} unpaid e-challan`
      : null,
  ].filter((b): b is string => b !== null);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        description={`${scenario.name}. Day 0 is today; all records are simulated.`}
        actions={
          <>
            <Link to="/plan" className={styles.primaryLink}>
              Open plan
            </Link>
            <Link to="/simulate" className={styles.secondaryLink}>
              Try a disruption
            </Link>
          </>
        }
      />

      {isDegraded && (
        <Banner variant="degraded" title="Rules unknown for the destination state">
          <p>
            No rule pack exists for {scenario.move.toRTO}. Steps that depend on it are marked
            unknown and no fees or dates are guessed. Check the official transport portal before
            acting.
          </p>
        </Banner>
      )}

      <section className={styles.stats} aria-label="Plan summary">
        <div className={styles.stat}>
          <span className={styles.statLabel}>Plan finishes</span>
          <span className={styles.statValue}>Day {currentPlan.finish}</span>
          <span className={styles.statNote}>{currentPlan.tasks.length} tasks</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Licence renewal</span>
          <span className={styles.statValue}>
            {renewal ? `Day ${renewal.end}` : 'Not planned'}
          </span>
          <span className={styles.statNote}>
            {renewal ? <StatusTag status={renewal.status} size="sm" /> : null}
            <span> expires day {scenario.licenceExpiryDay}</span>
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Checks</span>
          <span className={styles.statValue}>
            {passed} of {currentPlan.checks.length}
          </span>
          <span className={styles.statNote}>
            {failedChecks.length === 0 ? 'all passed' : `${failedChecks.length} need attention`}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Holding things up</span>
          <span className={styles.statValue}>{blockers.length}</span>
          <span className={styles.statNote}>
            {blockers.length ? blockers.join(' and ') : 'nothing open'}
          </span>
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="runway-title">
        <h2 id="runway-title" className={styles.panelTitle}>
          Licence runway
        </h2>
        <Runway
          expiryDay={scenario.licenceExpiryDay}
          renewal={renewal ? { start: renewal.start, end: renewal.end, status: renewal.status } : null}
          absence={scenario.absence}
          firstSlotDay={scenario.primarySlotQueue}
          finishDay={currentPlan.finish}
        />
      </section>

      <div className={styles.columns}>
        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby="attention-title">
            <h2 id="attention-title" className={styles.panelTitle}>
              Needs attention
            </h2>
            {attention.length === 0 && failedChecks.length === 0 ? (
              <p className={styles.empty}>
                Nothing needs attention in this scenario. Try a disruption to see how the plan
                responds.
              </p>
            ) : (
              <ul className={styles.list}>
                {attention.map((t) => (
                  <li key={t.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <StatusTag status={t.status} size="sm" />
                      <span className={styles.itemTitle}>{t.name}</span>
                    </div>
                    <span className={styles.itemMeta}>
                      Days {t.start} to {t.end}; latest safe start day {t.lsd}
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => openTask(t)}>
                      See why in the plan
                    </Button>
                  </li>
                ))}
                {failedChecks.map((c) => (
                  <li key={c.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <StatusTag status="Missed" size="sm" />
                      <span className={styles.itemTitle}>{c.ruleName}</span>
                    </div>
                    <span className={styles.itemMeta}>{c.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="next-title">
            <h2 id="next-title" className={styles.panelTitle}>
              Next up
            </h2>
            <ol className={styles.list}>
              {nextUp.map((t) => (
                <li key={t.id} className={styles.item}>
                  <div className={styles.itemMain}>
                    <span className={styles.days}>
                      Day {t.start} to {t.end}
                    </span>
                    <span className={styles.itemTitle}>{t.name}</span>
                  </div>
                  <StatusTag status={t.status} size="sm" />
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className={styles.column}>
          <section className={styles.panel} aria-labelledby="rec-title">
            <h2 id="rec-title" className={styles.panelTitle}>
              Recommended route
            </h2>
            {best ? (
              <>
                <p className={styles.body}>
                  Best plan right now: renew by {ROUTE_TEXT[best.decisions.licenceRoute]}
                  {scenario.blockers.form35Open && !scenario.move.isBHSeries
                    ? ` and ${FORM35_TEXT[best.decisions.form35]}`
                    : ''}
                  . It finishes on day {best.expectedPlan.finish}
                  {best.licenceLapseDays > 0
                    ? ` but the licence still lapses by ${best.licenceLapseDays} days.`
                    : ' and keeps the licence valid.'}
                </p>
                <p className={styles.body}>
                  Timings are assumed and the rules behind them are unverified.
                </p>
                {onBest ? (
                  <p className={styles.good}>You are on the recommended plan.</p>
                ) : (
                  <Button variant="primary" size="sm" onClick={applyBest}>
                    Use the recommended plan
                  </Button>
                )}
              </>
            ) : (
              <p className={styles.empty}>No route comparison is available.</p>
            )}
          </section>

          <section className={styles.panel} aria-labelledby="house-title">
            <h2 id="house-title" className={styles.panelTitle}>
              Household
            </h2>
            <p className={styles.body}>
              {householdVehicles.length} vehicles on this dashboard.{' '}
              {sharedWithYou > 0
                ? `${sharedWithYou} shared with you under an active consent.`
                : 'No family vehicle is shared with you right now.'}{' '}
              Owner identity numbers stay masked.
            </p>
            <Link to="/household" className={styles.secondaryLink}>
              Manage household
            </Link>
          </section>

          <section className={styles.panel} aria-labelledby="go-title">
            <h2 id="go-title" className={styles.panelTitle}>
              Jump to
            </h2>
            <div className={styles.links}>
              <Link to="/voice" className={styles.secondaryLink}>
                Enter a plate by voice
              </Link>
              <Link to="/sources" className={styles.secondaryLink}>
                Check the sources
              </Link>
              <Link to="/metrics" className={styles.secondaryLink}>
                See the metrics
              </Link>
              <Link to="/overview" className={styles.secondaryLink}>
                About Pravaah
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
