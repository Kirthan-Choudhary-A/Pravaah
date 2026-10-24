import React, { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { HeroPlate } from '@three/scenes/HeroPlate/HeroPlate';
import { ArchitectureStack } from '@three/scenes/ArchitectureStack/ArchitectureStack';
import { MagneticButton } from '@components/ui/MagneticButton';
import { loadScenario, loadSources } from '@data';
import type { SourceEntry } from '@engine';
import { useDeviceCapabilities } from '@hooks/useDeviceCapabilities';
import styles from './StoryPage.module.css';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(ScrollTrigger);
}

interface WalkthroughStep {
  readonly num: string;
  readonly title: string;
  readonly body: string;
  readonly ruleTag: string;
  readonly badgeText?: string | undefined;
  readonly badgeVariant?: 'safe' | 'risk' | 'missed' | undefined;
}

const buildSteps = (daysRemaining: number): readonly WalkthroughStep[] => [
  {
    num: '01',
    title: 'Reads the plate in local rhythm',
    body: 'Typed input or scripted voice samples. Normalises "O" to "0", strips extra hyphens, and reads back the registration number for confirmation. Live speech capture is not yet tested.',
    ruleTag: 'Positional parser',
  },
  {
    num: '02',
    title: 'Pins the licence expiry on one timeline',
    body: `In the simulated scenario the licence expires on day ${daysRemaining}. The move, the open request and the owner's away days go on the same timeline.`,
    ruleTag: 'Scenario A (simulated)',
    badgeText: `${daysRemaining} days to expiry (simulated)`,
    badgeVariant: 'risk',
  },
  {
    num: '03',
    title: 'Builds one DAG with a reason on every link',
    body: 'Every dependency states why it exists, its basis (statute, notification or modelled) and its sources, and is marked unverified until the source is read. Tasks sit in topological order.',
    ruleTag: 'Typed links',
  },
  {
    num: '04',
    title: 'Computes Latest Safe Date (LSD)',
    body: 'Works backwards from the expiry with assumed buffer days for slot queues, processing and absences. Each task shows its own status in words.',
    ruleTag: 'Engine back-propagation',
  },
  {
    num: '05',
    title: 'Flags the Address-Proof Trap',
    body: "Modelled rule (assumed): updating Aadhaar before the NOC is issued breaks the old RTO's address check. Pravaah orders the Aadhaar update after the NOC and warns on the link.",
    ruleTag: 'Modelled rule, unverified',
    badgeText: 'Invalidates the NOC if done early',
    badgeVariant: 'missed',
  },
  {
    num: '06',
    title: 'Simulates disruptions',
    body: 'Inject a Form 35 rejection, a slot shortage, a longer trip or an early Aadhaar update. The plan and its dates are recomputed with a before and after comparison.',
    ruleTag: 'What-If Engine',
  },
  {
    num: '07',
    title: 'Masks family records behind consent',
    body: 'Identifiers are masked by default. Revealing one needs a stated purpose and is written to an audit log.',
    ruleTag: 'Privacy by Design',
  },
  {
    num: '08',
    title: 'Shows the basis on every card',
    body: 'Each task and link lists its basis and cited sources. Every source is currently flagged unverified until someone reads the official text.',
    ruleTag: 'Open Citations',
  },
];

export const StoryPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const walkthroughRef = useRef<HTMLDivElement | null>(null);
  const { prefersReducedMotion } = useDeviceCapabilities();

  // Live figures straight from the bundled simulated data
  const { daysRemaining, sourcesCount, unverifiedCount } = useMemo(() => {
    const sources = loadSources();
    return {
      daysRemaining: loadScenario('A').licenceExpiryDay,
      sourcesCount: sources.length,
      unverifiedCount: sources.filter((s: SourceEntry) => !s.verified).length,
    };
  }, []);
  const steps = useMemo(() => buildSteps(daysRemaining), [daysRemaining]);

  useGSAP(
    () => {
      if (
        prefersReducedMotion ||
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
      )
        return;

      const items = gsap.utils.toArray<HTMLElement>(`.${styles.walkthroughCard}`);
      if (items.length === 0) return;

      items.forEach((item) => {
        gsap.from(item, {
          y: 28,
          opacity: 0.2,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            end: 'top 45%',
            scrub: 0.5,
            toggleActions: 'play none none reverse',
          },
        });

        // Add subtle counter progression
        ScrollTrigger.create({
          trigger: item,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => item.setAttribute('data-active', 'true'),
          onLeave: () => item.removeAttribute('data-active'),
          onEnterBack: () => item.setAttribute('data-active', 'true'),
          onLeaveBack: () => item.removeAttribute('data-active'),
        });
      });
    },
    { scope: walkthroughRef, dependencies: [prefersReducedMotion] }
  );

  return (
    <div ref={containerRef} className={styles.storyPage}>
      {/* SIMULATED label banner */}
      <div className={styles.topBadgeBar}>
        <span className={styles.simulatedPill}>SIMULATED</span>
        <span className={styles.topBadgeText}>
          Prototype on simulated citizen data • IMPACTX 2026 Challenge 09
        </span>
      </div>

      {/* 1. HERO SECTION WITH 3D PLATE */}
      <section className={styles.heroSection} aria-labelledby="hero-title">
        <div className={styles.heroText}>
          <span className={styles.kicker}>One plan • Every dependency explained</span>
          <h1 id="hero-title" className={styles.heroTitle}>
            Story: Transport compliance, untangled.
          </h1>
          <p className={styles.heroSubtitle}>
            A citizen-first assistant for driving licences, personal vehicles, and family fleets.
            One unified schedule, a stated reason for every dependency, and masked, consent-based
            sharing for household members.
          </p>
          <div className={styles.heroActions}>
            <MagneticButton href="/plan" variant="primary">
              Launch Planner
            </MagneticButton>
            <MagneticButton href="/simulate" variant="secondary">
              Simulate Disruptions
            </MagneticButton>
          </div>
          <div className={styles.heroProofRow}>
            <div className={styles.proofItem}>
              <strong>No Guesswork</strong>
              <span>Every task shows its reason and basis</span>
            </div>
            <div className={styles.proofDivider} aria-hidden="true" />
            <div className={styles.proofItem}>
              <strong>Privacy First</strong>
              <span>Masked, consent-based household sharing</span>
            </div>
            <div className={styles.proofDivider} aria-hidden="true" />
            <div className={styles.proofItem}>
              <strong>Deterministic</strong>
              <span>Runs purely in your browser</span>
            </div>
          </div>
        </div>

        <div
          className={styles.heroVisual}
          aria-label="Interactive 3D Registration Plate and Licence Card"
        >
          <HeroPlate />
        </div>
      </section>

      {/* 2. THE PROBLEM (7-POINT EDITORIAL LIST) */}
      <section className={styles.problemSection} aria-labelledby="problem-title">
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>The Friction</span>
          <h2 id="problem-title" className={styles.sectionTitle}>
            Seven points of friction in vehicle and licence services
          </h2>
          <p className={styles.sectionSubtitle}>
            When several services are needed at once, the order matters and the portals do not lay
            it out.
          </p>
        </div>

        <ol className={styles.problemList}>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>01</span>
            <div>
              <h3 className={styles.problemHeading}>Isolated, siloed portals</h3>
              <p className={styles.problemDesc}>
                Sarathi handles driving licences, Vahan handles vehicles, and each state sets its
                own procedures, fees and appointment capacity. A citizen needing several services
                has to work out the order alone.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>02</span>
            <div>
              <h3 className={styles.problemHeading}>Silent cascading expirations</h3>
              <p className={styles.problemDesc}>
                An open application or unpaid dues on a vehicle can stop new requests, and the
                portal often shows only that a transaction is already pending, not what to do first.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>03</span>
            <div>
              <h3 className={styles.problemHeading}>The Address-Update Trap</h3>
              <p className={styles.problemDesc}>
                A new Aadhaar address proves the new residence, but in the modelled rules the old
                RTO checks the address against the RC before issuing the NOC. Update too early and
                the NOC breaks; too late and there is no proof of the new address. This is a
                modelled rule, not yet verified.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>04</span>
            <div>
              <h3 className={styles.problemHeading}>Unrealistic buffer assumptions</h3>
              <p className={styles.problemDesc}>
                Portal submission is not completion. Processing, verification and dispatch add lead
                time that differs by RTO, so Pravaah uses timings labelled as assumed.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>05</span>
            <div>
              <h3 className={styles.problemHeading}>Absence blindness</h3>
              <p className={styles.problemDesc}>
                A visit cannot happen while the owner is away. Pravaah schedules in-person visits
                around the owner's away days and shows when slot scarcity puts a deadline at risk.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>06</span>
            <div>
              <h3 className={styles.problemHeading}>Over-exposure of family records</h3>
              <p className={styles.problemDesc}>
                Managing a relative's vehicle can mean passing identifiers and documents around
                informally. Pravaah masks them by default and logs every reveal.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>07</span>
            <div>
              <h3 className={styles.problemHeading}>Opaque, unsubstantiated rules</h3>
              <p className={styles.problemDesc}>
                Rules and fees differ by state and change over time. Pravaah shows the source and
                last-checked date for each rule and fee, and marks the ones nobody has verified.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* 3. HOW THE PLAN WORKS (8-STEP SCROLLTRIGGER WALKTHROUGH) */}
      <section
        ref={walkthroughRef}
        className={styles.walkthroughSection}
        aria-labelledby="walkthrough-title"
      >
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>The Methodology</span>
          <h2 id="walkthrough-title" className={styles.sectionTitle}>
            How Pravaah computes your compliance path
          </h2>
          <p className={styles.sectionSubtitle}>
            From audio transcription to topological graph resolution in 8 deterministic steps.
          </p>
        </div>

        <div className={styles.walkthroughGrid}>
          {steps.map((step) => (
            <article key={step.num} className={styles.walkthroughCard}>
              <div className={styles.walkthroughCardTop}>
                <span className={styles.walkthroughNum}>{step.num}</span>
                <span className={styles.walkthroughRule}>{step.ruleTag}</span>
              </div>
              <h3 className={styles.walkthroughCardTitle}>{step.title}</h3>
              <p className={styles.walkthroughCardBody}>{step.body}</p>
              {step.badgeText && (
                <div className={styles.cardBadge}>
                  <span
                    className={`${styles.statusDot} ${
                      step.badgeVariant === 'risk'
                        ? styles.dotRisk
                        : step.badgeVariant === 'missed'
                          ? styles.dotMissed
                          : styles.dotSafe
                    }`}
                  />
                  <span>{step.badgeText}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* 4. THE ADDRESS-PROOF TRAP (FEATURED CAUTION BLOCK) */}
      <section className={styles.trapSection} aria-labelledby="trap-title">
        <div className={styles.trapContainer}>
          <div className={styles.trapBadgeRow}>
            <span className={styles.trapWarningTag}>MODELLED DEPENDENCY</span>
            <span className={styles.trapRuleTag}>Modelled rule (assumed), unverified</span>
          </div>
          <h2 id="trap-title" className={styles.trapTitle}>
            The Address-Proof Trap
          </h2>
          <p className={styles.trapExplanation}>
            When a citizen moves state, the new address must be proven for the licence and the
            vehicle, and an Aadhaar update is the obvious proof. In the modelled rules the old RTO
            checks the address against the RC before issuing the NOC, so updating Aadhaar first
            breaks the NOC and it must be redone. Pravaah therefore sequences the Aadhaar update
            after the NOC and shows the cost if it is done early. A registered rental agreement
            covers the new-address proof for the registration in the meantime. These are modelled
            rules, not confirmed law.
          </p>
          <div className={styles.trapDiagram} aria-label="Address update dependency chain">
            <div className={styles.diagramNode}>
              <span className={styles.nodeKind}>Vehicle Task</span>
              <strong>Form 28 NOC</strong>
              <small>Issued by the old RTO</small>
            </div>
            <div className={styles.diagramArrow}>
              <span>then (needs)</span>
              <div className={styles.arrowLine} />
            </div>
            <div className={`${styles.diagramNode} ${styles.diagramNodeAlert}`}>
              <span className={styles.nodeKind}>Identity Task</span>
              <strong>Aadhaar address update</strong>
              <small>Invalidates the NOC if done first</small>
            </div>
            <div className={styles.diagramArrow}>
              <span>propagates</span>
              <div className={styles.arrowLine} />
            </div>
            <div className={styles.diagramNode}>
              <span className={styles.nodeKind}>Licence Task</span>
              <strong>DL address change</strong>
              <small>Online, from the new Aadhaar</small>
            </div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT'S BUILT (ARCHITECTURE STACK) */}
      <section className={styles.architectureSection} aria-labelledby="arch-title">
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>Architecture</span>
          <h2 id="arch-title" className={styles.sectionTitle}>
            Engineered for pure determinism
          </h2>
          <p className={styles.sectionSubtitle}>
            Zero backend dependencies. Pure TypeScript DAG engine running in the client thread.
          </p>
        </div>

        <ArchitectureStack />
      </section>

      {/* 6. HONEST BY DESIGN (SOURCE / UNVERIFIED STATS) */}
      <section className={styles.honestSection} aria-labelledby="honest-title">
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>Verifiability</span>
          <h2 id="honest-title" className={styles.sectionTitle}>
            Honest by design
          </h2>
          <p className={styles.sectionSubtitle}>
            Every rule, fee and link shows its basis and sources, and is marked unverified until the
            official text has been read.
          </p>
        </div>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{sourcesCount}</span>
            <span className={styles.statLabel}>Official Sources Registered</span>
            <p className={styles.statDesc}>
              India Code, MoRTH, the Parivahan portals and state transport portals, as targets to
              read.
            </p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{unverifiedCount}</span>
            <span className={styles.statLabel}>Awaiting Manual Verification</span>
            <p className={styles.statDesc}>
              Registry entries still marked verified: false. Nothing is verified until someone reads
              it.
            </p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{daysRemaining}d</span>
            <span className={styles.statLabel}>Days to licence expiry (Scenario A)</span>
            <p className={styles.statDesc}>
              Taken from the simulated scenario's licence expiry day.
            </p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>None</span>
            <span className={styles.statLabel}>Server calls for planning</span>
            <p className={styles.statDesc}>
              Plans are computed in the browser from bundled, simulated data.
            </p>
          </div>
        </div>

        <div className={styles.honestLinkRow}>
          <Link to="/sources" className={styles.honestLink}>
            Inspect all official legal sources &rarr;
          </Link>
        </div>
      </section>

      {/* 7. CLOSING CTA (WITH MAGNETIC BUTTONS) */}
      <section className={styles.ctaSection} aria-labelledby="cta-title">
        <div className={styles.ctaCard}>
          <span className={styles.kicker}>Start Planning</span>
          <h2 id="cta-title" className={styles.ctaTitle}>
            Experience the workflow yourself
          </h2>
          <p className={styles.ctaSubtitle}>
            Review the simulated scenario, simulate sudden schedule disruptions, manage household
            consent, or inspect the underlying legal source files.
          </p>

          <div className={styles.ctaButtonGroup}>
            <MagneticButton href="/plan" variant="primary">
              Open Master Plan
            </MagneticButton>
            <MagneticButton href="/simulate" variant="secondary">
              Simulation Lab
            </MagneticButton>
            <MagneticButton href="/household" variant="secondary">
              Household Delegation
            </MagneticButton>
            <MagneticButton href="/voice" variant="secondary">
              Plate Parser & Voice
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* EDITORIAL NOTE */}
      <div className={styles.storyFooter}>
        <p>
          Crafted for IMPACTX 2026 Challenge 09 &ldquo;Vehicle & Driving Services Made
          Simple&rdquo;.
        </p>
      </div>
    </div>
  );
};

export default StoryPage;
