import React, { Suspense, lazy, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePlan } from '@state/PlanContext';
import { Runway } from '@components/plan/Runway';
import { StatusTag } from '@components/ui/StatusTag';
import { Banner } from '@components/ui/Banner';
import { Button } from '@components/ui/Button';
import styles from './DashboardPage.module.css';

const CadVehicleScene = lazy(() =>
  import('@three/scenes/CadVehicle/CadVehicleScene').then((m) => ({ default: m.CadVehicleScene }))
);

const ROUTE_TEXT = {
  online: 'online with Aadhaar',
  'rto-visit': 'at the RTO',
  'another-rto': 'at another RTO',
  'another-date': 'at the RTO after your trip',
} as const;

export const DashboardPage: React.FC = () => {
  const {
    scenario,
    currentPlan,
    decisions,
    optionsComparison,
    isDegraded,
    setForm35Decision,
    setLicenceRouteDecision,
  } = usePlan();

  const renewal = currentPlan.tasks.find((t) => t.id === 'task-licence-renewal') ?? null;
  const best = optionsComparison[0];
  const onBest =
    !best ||
    (best.decisions.form35 === decisions.form35 &&
      best.decisions.licenceRoute === decisions.licenceRoute);
  const lapses = renewal !== null && renewal.end > scenario.licenceExpiryDay;

  const nextSteps = useMemo(
    () => [...currentPlan.tasks].sort((a, b) => a.start - b.start || a.end - b.end).slice(0, 5),
    [currentPlan.tasks]
  );
  const late = currentPlan.tasks.filter((t) => t.status === 'Missed').length;

  const applyBest = () => {
    if (!best) return;
    setForm35Decision(best.decisions.form35);
    setLicenceRouteDecision(best.decisions.licenceRoute);
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroText}>
          <p className={styles.heroKicker}>
            {scenario.move.fromRTO} to {scenario.move.toRTO}
          </p>
          <h1 id="hero-title" className={styles.heroTitle}>
            Dashboard
          </h1>
          <p className={styles.heroCount} aria-label={`Licence expires in ${scenario.licenceExpiryDay} days`}>
            <span className={styles.heroNumber}>{scenario.licenceExpiryDay}</span>
            <span className={styles.heroUnit}>days until your licence expires</span>
          </p>
          <p className={styles.heroLine}>
            {renewal
              ? lapses
                ? `Renewal would finish on day ${renewal.end}, too late. Choose a faster route.`
                : `Renewal finishes on day ${renewal.end}, in time.`
              : 'No renewal is planned yet.'}
          </p>
          <div className={styles.heroActions}>
            <Link to="/plan" className={styles.primaryLink}>
              Open my plan
            </Link>
            <Link to="/simulate" className={styles.ghostLink}>
              Try a change
            </Link>
          </div>
        </div>
        <div className={styles.heroScene}>
          <Suspense fallback={<div className={styles.sceneLoading}>Preparing 3D model…</div>}>
            <CadVehicleScene solid={1} />
          </Suspense>
        </div>
      </section>

      {isDegraded && (
        <Banner variant="degraded" title="No rules for this state">
          <p>
            Pravaah has no rules for {scenario.move.toRTO}. Check the state transport website
            before you act.
          </p>
        </Banner>
      )}

      {lapses && (
        <Banner variant="degraded" title="Your licence would expire before renewal finishes">
          <p>
            It expires on day {scenario.licenceExpiryDay} but renewal would finish on day{' '}
            {renewal?.end}. {best && !onBest ? 'Use the recommended plan below.' : ''}
          </p>
        </Banner>
      )}

      <section className={styles.stats} aria-label="Summary">
        <div className={styles.stat}>
          <span className={styles.statLabel}>Licence expires</span>
          <span className={styles.statValue}>Day {scenario.licenceExpiryDay}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Renewal finishes</span>
          <span className={styles.statValue}>{renewal ? `Day ${renewal.end}` : 'Not planned'}</span>
          {renewal && <StatusTag status={renewal.status} size="sm" />}
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Everything done by</span>
          <span className={styles.statValue}>Day {currentPlan.finish}</span>
          {late > 0 && <span className={styles.statNote}>{late} steps will be late</span>}
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="runway-title">
        <h2 id="runway-title" className={styles.panelTitle}>
          Licence timeline
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
        <section className={styles.panel} aria-labelledby="next-title">
          <h2 id="next-title" className={styles.panelTitle}>
            Next steps
          </h2>
          <ol className={styles.list}>
            {nextSteps.map((t) => (
              <li key={t.id} className={styles.item}>
                <span className={styles.days}>
                  Day {t.start}–{t.end}
                </span>
                <span className={styles.itemTitle}>{t.name}</span>
                <StatusTag status={t.status} size="sm" />
              </li>
            ))}
          </ol>
          <Link to="/plan" className={styles.textLink}>
            See all {currentPlan.tasks.length} steps
          </Link>
        </section>

        <section className={styles.panel} aria-labelledby="rec-title">
          <h2 id="rec-title" className={styles.panelTitle}>
            Best way to renew
          </h2>
          {best ? (
            <>
              <p className={styles.body}>
                Renew {ROUTE_TEXT[best.decisions.licenceRoute]}. Everything is done by day{' '}
                {best.expectedPlan.finish}
                {best.licenceLapseDays > 0 ? ', but the licence still lapses.' : '.'}
              </p>
              {onBest ? (
                <p className={styles.good}>You are on this plan.</p>
              ) : (
                <Button variant="primary" size="sm" onClick={applyBest}>
                  Use this plan
                </Button>
              )}
            </>
          ) : (
            <p className={styles.empty}>No comparison available.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
