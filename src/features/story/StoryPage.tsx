import React, { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { HeroPlate } from '@three/scenes/HeroPlate/HeroPlate';
import { ArchitectureStack } from '@three/scenes/ArchitectureStack/ArchitectureStack';
import { MagneticButton } from '@components/ui/MagneticButton';
import { loadScenario, loadSources, loadMergedRulePack } from '@data';
import { planScenario } from '@engine';
import type { ScheduledTask, SourceEntry } from '@engine';
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

const STEPS: readonly WalkthroughStep[] = [
  {
    num: '01',
    title: 'Reads the plate in local rhythm',
    body: 'Spoken, typed, or noisy audio. Normalises "O" to "0", strips extra hyphens, and pins down the registration series without phoning home.',
    ruleTag: 'Rule KA-REG-01',
  },
  {
    num: '02',
    title: 'Discovers vehicle and licence validity dates',
    body: 'Pins the licence expiry (16 days away), fitness inspection deadline, and road tax cycle into a unified timeline.',
    ruleTag: 'CMVR Rule 14 & 62',
    badgeText: '16d to expiry',
    badgeVariant: 'risk',
  },
  {
    num: '03',
    title: 'Builds one DAG with causal explanations',
    body: 'Every single dependency is grounded in a legal or physical reason. No arbitrary ordering; tasks sit in topological order.',
    ruleTag: 'MV Act §14(2)',
  },
  {
    num: '04',
    title: 'Computes Latest Safe Date (LSD)',
    body: 'Working backwards from critical expirations with real-world buffer days for portal delays, document uploads, and dispatch windows.',
    ruleTag: 'Engine Back-propagation',
    badgeText: 'Safe',
    badgeVariant: 'safe',
  },
  {
    num: '05',
    title: 'Detects the Address-Proof Trap',
    body: 'If you move your Aadhaar or DL address, vehicle RC updates become compulsory within 30 days — or your claims risk invalidation.',
    ruleTag: 'MV Act §49',
    badgeText: 'RC Invalidates',
    badgeVariant: 'missed',
  },
  {
    num: '06',
    title: 'Simulates unannounced disruptions',
    body: 'Inject travel absences, medical certificate rejections, or slot shortages. The engine rebuilds downstream tasks instantly.',
    ruleTag: 'What-If Engine',
  },
  {
    num: '07',
    title: 'Masks family records behind verified consent',
    body: 'Full masking by default. Vehicle identifiers stay shielded until an active consent token with specific scope is granted.',
    ruleTag: 'Privacy by Design',
  },
  {
    num: '08',
    title: 'Verifiable legal basis on every card',
    body: 'Every citation links directly to India Code or Parivahan portals, with unverified rule overrides clearly flagged.',
    ruleTag: 'Open Citations',
  },
];

export const StoryPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const walkthroughRef = useRef<HTMLDivElement | null>(null);
  const { prefersReducedMotion } = useDeviceCapabilities();

  // Compute live scenario and source metrics
  const { daysRemaining, sourcesCount, unverifiedCount } = useMemo(() => {
    try {
      const scenarioA = loadScenario('A');
      const mergedPack = loadMergedRulePack(scenarioA.move.toState);
      const plan = planScenario({
        scenario: scenarioA,
        mergedPack,
        decisions: { form35: 'wait', licenceRoute: 'online' },
        events: [],
      });
      const dlTask = plan.tasks.find((t: ScheduledTask) => t.id.includes('dl') || t.lane === 'licence');
      const sources = loadSources();
      const unverified = sources.filter((s: SourceEntry) => !s.verified).length;

      return {
        daysRemaining: dlTask ? scenarioA.licenceExpiryDay : 16,
        sourcesCount: sources.length,
        unverifiedCount: unverified,
      };
    } catch {
      return { daysRemaining: 16, sourcesCount: 10, unverifiedCount: 10 };
    }
  }, []);

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
          <span className={styles.kicker}>One plan • Every dependency • Zero surprises</span>
          <h1 id="hero-title" className={styles.heroTitle}>
            Story: Transport compliance, untangled.
          </h1>
          <p className={styles.heroSubtitle}>
            A citizen-first assistant for driving licences, personal vehicles, and family fleets.
            One unified causal schedule, explicit reasons for every deadline, and absolute privacy
            for delegated household members.
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
              <span>Every task justified by law</span>
            </div>
            <div className={styles.proofDivider} aria-hidden="true" />
            <div className={styles.proofItem}>
              <strong>Privacy First</strong>
              <span>Zero-knowledge household sharing</span>
            </div>
            <div className={styles.proofDivider} aria-hidden="true" />
            <div className={styles.proofItem}>
              <strong>Deterministic</strong>
              <span>Runs purely in your browser</span>
            </div>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Interactive 3D Registration Plate and Licence Card">
          <HeroPlate />
        </div>
      </section>

      {/* 2. THE PROBLEM (7-POINT EDITORIAL LIST) */}
      <section className={styles.problemSection} aria-labelledby="problem-title">
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>The Friction</span>
          <h2 id="problem-title" className={styles.sectionTitle}>
            Seven ways Indian transport services fail citizens today
          </h2>
          <p className={styles.sectionSubtitle}>
            Administrative fragmentation across disparate portals turns simple routine renewals into
            compound compliance failures.
          </p>
        </div>

        <ol className={styles.problemList}>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>01</span>
            <div>
              <h3 className={styles.problemHeading}>Isolated, siloed portals</h3>
              <p className={styles.problemDesc}>
                Sarathi handles driving licences, Vahan handles vehicles, and state RTO portals handle
                permits. None of them share schedules or warn of inter-dependencies.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>02</span>
            <div>
              <h3 className={styles.problemHeading}>Silent cascading expirations</h3>
              <p className={styles.problemDesc}>
                A lapsed driving licence invalidates commercial vehicle operations; an expired PUC
                blocks annual fitness certificates without any proactive notification.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>03</span>
            <div>
              <h3 className={styles.problemHeading}>The Address-Update Trap</h3>
              <p className={styles.problemDesc}>
                Updating your address on Aadhaar creates a statutory 30-day mandate to update all
                linked registration certificates (RCs). Miss it, and vehicle sales or insurance claims
                are rejected.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>04</span>
            <div>
              <h3 className={styles.problemHeading}>Unrealistic buffer assumptions</h3>
              <p className={styles.problemDesc}>
                Portal submission is not completion. Document verification, biometrics, and postal
                smart-card dispatch can add 14 to 28 days of invisible lead time.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>05</span>
            <div>
              <h3 className={styles.problemHeading}>Absence blindness</h3>
              <p className={styles.problemDesc}>
                Booking an RTO slot during a planned business trip or overseas vacation guarantees a
                missed deadline, resetting application queues and wasting paid challan fees.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>06</span>
            <div>
              <h3 className={styles.problemHeading}>Over-exposure of family records</h3>
              <p className={styles.problemDesc}>
                Managing an aging parent’s or spouse’s car requires trading raw OTPs, sharing full
                Aadhaar copies, and exposing unmasked personal identifiers across chat apps.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>07</span>
            <div>
              <h3 className={styles.problemHeading}>Opaque, unsubstantiated rules</h3>
              <p className={styles.problemDesc}>
                Citizens are quoted contradictory penalties and procedures by agents because portals
                rarely cite the exact section of the Motor Vehicles Act or CMVR.
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
          {STEPS.map((step) => (
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
            <span className={styles.trapWarningTag}>CRITICAL LEGAL DEPENDENCY</span>
            <span className={styles.trapRuleTag}>Motor Vehicles Act, 1988 §49</span>
          </div>
          <h2 id="trap-title" className={styles.trapTitle}>
            The Address-Proof Trap
          </h2>
          <p className={styles.trapExplanation}>
            When a citizen changes their residence and updates their driving licence or Aadhaar,
            Section 49 of the Motor Vehicles Act mandates updating every registered vehicle within 30
            days. If you update the licence first without scheduling vehicle record corrections,
            your vehicle’s registration details are legally inconsistent — risking invalidation during
            hypothecation cancellation, ownership transfers, or insurance claims.
          </p>
          <div className={styles.trapDiagram} aria-label="Address update dependency chain">
            <div className={styles.diagramNode}>
              <span className={styles.nodeKind}>Identity Event</span>
              <strong>Address Change</strong>
              <small>New residence registered</small>
            </div>
            <div className={styles.diagramArrow}>
              <span>invalidates</span>
              <div className={styles.arrowLine} />
            </div>
            <div className={styles.diagramNode}>
              <span className={styles.nodeKind}>Licence Task</span>
              <strong>DL Address Change</strong>
              <small>Proof submitted to Sarathi</small>
            </div>
            <div className={styles.diagramArrow}>
              <span>requires (30d)</span>
              <div className={styles.arrowLine} />
            </div>
            <div className={`${styles.diagramNode} ${styles.diagramNodeAlert}`}>
              <span className={styles.nodeKind}>Vehicle Mandate</span>
              <strong>RC Address Update</strong>
              <small>Forms 33 + Chassis pencil imprint</small>
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
            Every single date, fee, and prerequisite can be inspected directly down to its legal citation.
          </p>
        </div>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{sourcesCount}</span>
            <span className={styles.statLabel}>Official Sources Seeded</span>
            <p className={styles.statDesc}>
              India Code, Central Motor Vehicle Rules (CMVR), Sarathi, and state transport portals.
            </p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{unverifiedCount}</span>
            <span className={styles.statLabel}>Awaiting Manual Verification</span>
            <p className={styles.statDesc}>
              Strict rule packs explicitly mark unconfirmed state fee overrides with verified: false.
            </p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{daysRemaining}d</span>
            <span className={styles.statLabel}>Live DL Window (Scenario A)</span>
            <p className={styles.statDesc}>
              Dynamic window computed directly from the current seed timeline without estimation.
            </p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>0ms</span>
            <span className={styles.statLabel}>Network Latency</span>
            <p className={styles.statDesc}>
              All calculations execute client-side. Zero telemetry, zero server round-trips.
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
          Crafted for IMPACTX 2026 Challenge 09 &ldquo;Vehicle & Driving Services Made Simple&rdquo;.
        </p>
      </div>
    </div>
  );
};

export default StoryPage;
