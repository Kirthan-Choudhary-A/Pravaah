import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadScenario, loadSources, loadMergedRulePack } from '@data';
import { compareOptions } from '@engine';
import type { SourceEntry } from '@engine';
import { PageHeader } from '@components/layout/PageHeader';
import { StatusTag } from '@components/ui/StatusTag';
import styles from './StoryPage.module.css';

const CadVehicleViewer = lazy(() =>
  import('@three/scenes/CadVehicle/CadVehicleViewer').then((m) => ({ default: m.CadVehicleViewer }))
);

const PROBLEMS = [
  {
    title: 'Several portals, no order',
    body: 'Sarathi handles licences, Vahan handles vehicles, and each state sets its own steps. Nothing tells you which comes first.',
  },
  {
    title: 'A pending request blocks the next one',
    body: 'An open application or unpaid challan can stop a new request. The portal says only that a transaction is pending.',
  },
  {
    title: 'The address trap',
    body: 'A new Aadhaar address proves where you live now, but in the modelled rules the old RTO checks the address against your RC before issuing the NOC. This rule is assumed and not yet verified.',
  },
  {
    title: 'Slots and trips',
    body: 'A visit cannot happen while you are away, and appointment queues can push a renewal past expiry.',
  },
  {
    title: 'Family paperwork',
    body: "Managing a relative's vehicle often means passing identifiers around. Pravaah masks them and logs every reveal.",
  },
] as const;

const WAYS = [
  { title: 'One ordered plan', body: 'Every step in dependency order, each with the reason it comes where it does.' },
  { title: 'Latest safe dates', body: 'The last day each step can start and still finish in time, from assumed processing times.' },
  { title: 'What if', body: 'Change a delay or a decision and see the plan and its dates recalculate.' },
  { title: 'Family vehicles', body: 'Share a vehicle with consent that has a scope and an end date. Owner identity numbers stay masked.' },
  { title: 'Your language', body: 'Ask the assistant in English or in an Indian language, by typing or speaking.' },
  { title: 'Sources, not guesses', body: 'Each rule shows its basis and sources and is marked unverified until someone reads the official text.' },
] as const;

export const StoryPage: React.FC = () => {
  const [key, setKey] = useState<'A' | 'B' | 'C'>('A');

  const details = useMemo(() => {
    const scenario = loadScenario(key);
    const pack = loadMergedRulePack(scenario.move.toState);
    const best = compareOptions({
      scenario,
      mergedPack: pack,
      decisions: { form35: 'resolve', licenceRoute: 'online' },
    })[0];
    const plan = best?.expectedPlan;
    const degraded = plan?.degradedMode ?? false;

    const steps: string[] = [];
    if (degraded) {
      steps.push(
        `Rules are unknown for ${scenario.move.toRTO}, so its steps are marked "confirm with the RTO" and no dates or fees are guessed. Known steps are still planned.`
      );
    } else if (best) {
      const route = best.decisions.licenceRoute;
      steps.push(
        route === 'online'
          ? 'Renew the licence online first'
          : route === 'another-rto'
            ? 'Renew the licence at another RTO'
            : 'Renew the licence at the RTO'
      );
      if (scenario.blockers.form35Open && !scenario.move.isBHSeries) {
        steps.push(
          best.decisions.form35 === 'resolve'
            ? 'resolve the open Form 35 by grievance'
            : best.decisions.form35 === 'withdraw'
              ? 'withdraw Form 35 (the bank must then sign Form 28)'
              : 'wait for Form 35 to clear'
        );
      }
      steps.push(
        scenario.move.isBHSeries
          ? 'the modelled BH-series rule skips the NOC and re-registration (unverified)'
          : 'get the NOC, then update Aadhaar'
      );
    }

    const lapses = (best?.licenceLapseDays ?? 0) > 0;
    return {
      move: `${scenario.move.fromRTO} to ${scenario.move.toRTO}`,
      vehicle:
        (scenario.move.vehicleType === 'car' ? 'Car' : 'Two-wheeler') +
        (scenario.move.isBHSeries ? ', BH series' : '') +
        (scenario.blockers.form35Open ? ', Form 35 open' : ''),
      expiry: `Day ${scenario.licenceExpiryDay}`,
      recommendation: steps.length ? `${steps.join(', then ')}.` : 'No plan available.',
      finish: plan ? `plan finishes on day ${plan.finish}` : 'n/a',
      badge: degraded ? 'Degraded mode: rules unknown' : lapses ? 'Licence would lapse' : 'Licence renewed in time',
      status: degraded ? 'Unknown' : lapses ? 'Missed' : 'Safe',
    } as const;
  }, [key]);

  const { sourcesCount, unverifiedCount } = useMemo(() => {
    const sources = loadSources();
    return { sourcesCount: sources.length, unverifiedCount: sources.filter((s: SourceEntry) => !s.verified).length };
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader
        title="About Pravaah"
        description="One assistant for a driving licence, your vehicles and your family's vehicles. It orders the steps, shows the latest safe date for each, and says what it does not know."
        actions={
          <Link to="/plan" className={styles.cta}>
            Open my plan
          </Link>
        }
      />

      <section className={styles.hero} aria-label="Two-wheeler model">
        <div className={styles.heroScene}>
          <Suspense fallback={<div className={styles.loading}>Preparing 3D model…</div>}>
            <CadVehicleViewer zoomable />
          </Suspense>
        </div>
        <p className={styles.caption}>
          A technical model of a two-wheeler. Drag to turn it. Dimensions are illustrative.
        </p>
      </section>

      <section aria-labelledby="try-title" className={styles.block}>
        <h2 id="try-title" className={styles.h2}>
          Try a scenario
        </h2>
        <div className={styles.tabs} role="group" aria-label="Choose a scenario">
          {(
            [
              ['A', 'Scenario A: moving state'],
              ['B', 'Scenario B: BH-series plate'],
              ['C', 'Scenario C: unconfirmed state'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`${styles.tab ?? ''} ${key === k ? (styles.tabOn ?? '') : ''}`}
              aria-pressed={key === k}
              onClick={() => setKey(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.facts}>
          <div className={styles.fact}>
            <span className={styles.factLabel}>Moving</span>
            <span className={styles.factValue}>{details.move}</span>
            <span className={styles.factSub}>{details.vehicle}</span>
          </div>
          <div className={styles.fact}>
            <span className={styles.factLabel}>Licence expires</span>
            <span className={styles.factValue}>{details.expiry}</span>
            <span className={styles.factSub}>{details.finish}</span>
          </div>
          <div className={styles.fact}>
            <span className={styles.factLabel}>Best plan</span>
            <span className={styles.factText}>{details.recommendation}</span>
            <span className={styles.factSub}>
              <StatusTag status={details.status} size="sm" /> {details.badge}
            </span>
          </div>
        </div>
      </section>

      <section aria-labelledby="problems-title" className={styles.block}>
        <h2 id="problems-title" className={styles.h2}>
          What goes wrong
        </h2>
        <ul className={styles.cards}>
          {PROBLEMS.map((p) => (
            <li key={p.title} className={styles.card}>
              <h3 className={styles.h3}>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ways-title" className={styles.block}>
        <h2 id="ways-title" className={styles.h2}>
          What Pravaah does
        </h2>
        <ul className={styles.cards}>
          {WAYS.map((p) => (
            <li key={p.title} className={styles.card}>
              <h3 className={styles.h3}>{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="honest-title" className={styles.block}>
        <h2 id="honest-title" className={styles.h2}>
          How sure are we?
        </h2>
        <p className={styles.lede}>
          Every rule and fee here is modelled and unverified until someone reads the official text. Plans are
          computed in your browser from simulated data.
        </p>
        <div className={styles.facts}>
          <div className={styles.fact}>
            <span className={styles.factValue}>{sourcesCount}</span>
            <span className={styles.factSub}>official sources listed to check</span>
          </div>
          <div className={styles.fact}>
            <span className={styles.factValue}>{unverifiedCount}</span>
            <span className={styles.factSub}>still unverified</span>
          </div>
        </div>
        <Link to="/sources" className={styles.link}>
          See the sources
        </Link>
      </section>
    </div>
  );
};

export default StoryPage;
