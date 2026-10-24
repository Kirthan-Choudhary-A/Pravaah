import React, { useMemo, useRef, useState, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { HeroPlateFallback } from '@three/scenes/HeroPlate/HeroPlateFallback';
import { MagneticButton } from '@components/ui/MagneticButton';
import { loadScenario, loadSources } from '@data';
import type { SourceEntry } from '@engine';
import { useDeviceCapabilities } from '@hooks/useDeviceCapabilities';
import styles from './StoryPage.module.css';

const HeroPlate = lazy(() =>
  import('@three/scenes/HeroPlate/HeroPlate').then((m) => ({ default: m.HeroPlate }))
);
const ArchitectureStack = lazy(() =>
  import('@three/scenes/ArchitectureStack/ArchitectureStack').then((m) => ({
    default: m.ArchitectureStack,
  }))
);

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

const buildSimplifiedSteps = (daysRemaining: number): readonly WalkthroughStep[] => [
  {
    num: '01',
    title: 'Instant Plate & Voice Search',
    body: 'Type or speak your vehicle number in English, Hindi, Telugu, or Kannada. We auto-correct common mistakes (like O instead of 0) and verify the format.',
    ruleTag: 'Voice & Smart Parser',
  },
  {
    num: '02',
    title: 'Countdown to Expiry on One Timeline',
    body: `Your licence expires in ${daysRemaining} days. We line up your move dates, open applications, and out-of-town trips on a single clear calendar.`,
    ruleTag: 'Unified Calendar',
    badgeText: `${daysRemaining} days to expiry`,
    badgeVariant: 'risk',
  },
  {
    num: '03',
    title: 'Automatic Step-by-Step Order',
    body: 'Government portals don’t explain what to do first. Pravaah sequences your tasks in the exact legal order so no step blocks another.',
    ruleTag: 'Order Calculation',
  },
  {
    num: '04',
    title: 'Latest Safe Date (LSD) Calculator',
    body: 'Tells you the exact last day you can submit each application without missing RTO deadlines or paying expensive late fines.',
    ruleTag: 'No-Late-Fee Engine',
  },
  {
    num: '05',
    title: 'Moving Trap Warning (Aadhaar vs NOC)',
    body: 'Important alert: If you update your Aadhaar address before getting your vehicle NOC, your application gets rejected! We guide you in the correct sequence.',
    ruleTag: 'RTO Rejection Alert',
    badgeText: 'Do NOT change Aadhaar before NOC',
    badgeVariant: 'missed',
  },
  {
    num: '06',
    title: 'Test What-If Delays & Curveballs',
    body: 'What if an RTO appointment gets delayed 2 weeks? Or your loan clearance form is questioned? Simulate delays with one click and see the updated plan.',
    ruleTag: 'Disruption Sandbox',
  },
  {
    num: '07',
    title: 'Private Family Garage',
    body: 'Manage your parents’, spouse’s, or siblings’ cars safely. Sensitive Aadhaar and chassis numbers stay hidden until you explicitly need them.',
    ruleTag: 'Privacy by Design',
  },
  {
    num: '08',
    title: 'Transparent Official Rules & Fees',
    body: 'Every single deadline, fee amount, and rule is backed by official Motor Vehicle Acts and Parivahan notices with direct links.',
    ruleTag: 'Verified Legal Rules',
  },
];

export const StoryPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const walkthroughRef = useRef<HTMLDivElement | null>(null);
  const { prefersReducedMotion } = useDeviceCapabilities();

  // Interactive Scenario Quick-Tester
  const [activeScenarioKey, setActiveScenarioKey] = useState<'A' | 'B' | 'C'>('A');

  const scenarioDetails = useMemo(() => {
    switch (activeScenarioKey) {
      case 'A':
        return {
          title: 'Scenario A: Moving Hyderabad → Bengaluru',
          move: 'Telangana (TS09) to Karnataka (KA03)',
          vehicle: 'Car (Form 35 Loan Hypothecation Open)',
          licenceExpiry: 'Day 26 (Urgent)',
          recommendation: 'Clear Form 35 with bank, get TS NOC, then renew DL in Bengaluru.',
          totalDays: '28 Days',
          statusBadge: 'Urgent Action Required',
          statusVariant: 'risk',
        };
      case 'B':
        return {
          title: 'Scenario B: Pune → Chennai (BH-Series Plate)',
          move: 'Maharashtra (MH12) to Tamil Nadu (TN07)',
          vehicle: 'BH-Series Car (Nationwide Mobility)',
          licenceExpiry: 'Day 45 (Safe Window)',
          recommendation: 'BH plate requires no state road tax transfer! Just update DL address online via Aadhaar.',
          totalDays: '12 Days',
          statusBadge: 'Fast Track Available',
          statusVariant: 'safe',
        };
      case 'C':
        return {
          title: 'Scenario C: Delhi → Gangtok (Sikkim Rules)',
          move: 'Delhi (DL01) to Sikkim (SK01)',
          vehicle: 'Commercial Pickup / Tourist Permit',
          licenceExpiry: 'Day 60 (Normal)',
          recommendation: 'State rules unconfirmed. Central rules apply with automatic degraded-mode safety buffer.',
          totalDays: '35 Days',
          statusBadge: 'Degraded Mode Safety',
          statusVariant: 'missed',
        };
    }
  }, [activeScenarioKey]);

  // Live figures straight from simulated data
  const { daysRemaining, sourcesCount, unverifiedCount } = useMemo(() => {
    const sources = loadSources();
    return {
      daysRemaining: loadScenario('A').licenceExpiryDay,
      sourcesCount: sources.length,
      unverifiedCount: sources.filter((s: SourceEntry) => !s.verified).length,
    };
  }, []);

  const steps = useMemo(() => buildSimplifiedSteps(daysRemaining), [daysRemaining]);

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
          y: 20,
          opacity: 0.3,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            end: 'top 55%',
            scrub: 0.5,
            toggleActions: 'play none none reverse',
          },
        });
      });
    },
    { scope: walkthroughRef, dependencies: [prefersReducedMotion] }
  );

  return (
    <div ref={containerRef} className={styles.storyPage}>
      {/* 0. TOP BANNER */}
      <div className={styles.topBadgeBar}>
        <span className={styles.simulatedPill}>SIMULATED</span>
        <span className={styles.topBadgeText}>
          🚗 Pravaah • All-in-One Smart Vehicle & Driving Assistant • Built for Every Indian Citizen
        </span>
      </div>

      {/* 1. HERO SECTION WITH 3D PLATE */}
      <section className={styles.heroSection} aria-labelledby="hero-title">
        <div className={styles.heroText}>
          <span className={styles.kicker}>Simple • Step-by-Step • No RTO Fines</span>
          <h1 id="hero-title" className={styles.heroTitle}>
            Story — Vehicle &amp; Driving Services, <span className={styles.heroHighlight}>Made Simple.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Never miss an RTO deadline or get trapped in confusing government portals. Pravaah
            calculates your exact last safe dates, warns you about hidden document traps, and
            organizes your family vehicles in plain English anyone can follow.
          </p>

          <div className={styles.heroActions}>
            <MagneticButton href="/plan" variant="primary">
              ⚡ Open Smart Roadmap
            </MagneticButton>
            <MagneticButton href="/simulate" variant="secondary">
              🧪 Test Disruption Sandbox
            </MagneticButton>
          </div>

          <div className={styles.heroProofRow}>
            <div className={styles.proofItem}>
              <strong>⏱️ Exact Deadlines</strong>
              <span>Latest safe dates before late fees</span>
            </div>
            <div className={styles.proofDivider} aria-hidden="true" />
            <div className={styles.proofItem}>
              <strong>🛡️ Zero Portal Traps</strong>
              <span>Warns before you submit wrong docs</span>
            </div>
            <div className={styles.proofDivider} aria-hidden="true" />
            <div className={styles.proofItem}>
              <strong>🔒 100% Private</strong>
              <span>Masked family data, runs in browser</span>
            </div>
          </div>
        </div>

        <div
          className={styles.heroVisual}
          aria-label="Interactive 3D Registration Plate and Licence Card"
        >
          <Suspense fallback={<HeroPlateFallback expiryDaysBefore={daysRemaining} />}>
            <HeroPlate />
          </Suspense>
        </div>
      </section>

      {/* 1.5 INTERACTIVE SCENARIO QUICK TESTER */}
      <section className={styles.quickSandboxSection} aria-label="Interactive Scenario Quick Tester">
        <div className={styles.quickSandboxHeader}>
          <h2 className={styles.quickSandboxTitle}>
            <span>⚡ Interactive Preview:</span>
            <span>Choose a Real Citizen Scenario</span>
          </h2>
          <div className={styles.scenarioButtons}>
            <button
              type="button"
              className={`${styles.scenarioTabBtn} ${activeScenarioKey === 'A' ? styles.scenarioTabBtnActive : ''}`}
              onClick={() => setActiveScenarioKey('A')}
            >
              <span>🚚 Scenario A: Inter-State Move</span>
            </button>
            <button
              type="button"
              className={`${styles.scenarioTabBtn} ${activeScenarioKey === 'B' ? styles.scenarioTabBtnActive : ''}`}
              onClick={() => setActiveScenarioKey('B')}
            >
              <span>🛡️ Scenario B: BH-Series Plate</span>
            </button>
            <button
              type="button"
              className={`${styles.scenarioTabBtn} ${activeScenarioKey === 'C' ? styles.scenarioTabBtnActive : ''}`}
              onClick={() => setActiveScenarioKey('C')}
            >
              <span>⚠️ Scenario C: Unconfirmed State</span>
            </button>
          </div>
        </div>

        <div className={styles.scenarioLiveGrid}>
          <div className={styles.scenarioLiveCard}>
            <span className={styles.scenarioLiveLabel}>Moving Route</span>
            <span className={styles.scenarioLiveValue}>{scenarioDetails.move}</span>
            <span className={styles.scenarioLiveSub}>{scenarioDetails.vehicle}</span>
          </div>
          <div className={styles.scenarioLiveCard}>
            <span className={styles.scenarioLiveLabel}>Licence Expiry</span>
            <span className={styles.scenarioLiveValue}>{scenarioDetails.licenceExpiry}</span>
            <span className={styles.scenarioLiveSub}>Calculated timeline: {scenarioDetails.totalDays}</span>
          </div>
          <div className={styles.scenarioLiveCard}>
            <span className={styles.scenarioLiveLabel}>Recommended Action</span>
            <span className={styles.scenarioLiveValue} style={{ fontSize: '0.875rem' }}>
              {scenarioDetails.recommendation}
            </span>
            <span className={styles.scenarioLiveSub}>
              Status: <strong>{scenarioDetails.statusBadge}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
          <Link
            to="/plan"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--accent-yellow)',
              color: '#000',
              fontWeight: 800,
              border: '2px solid #000',
              borderRadius: '4px',
              boxShadow: '2px 2px 0px #000',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Launch Full Roadmap for this Scenario &rarr;
          </Link>
          <Link
            to="/simulate"
            style={{
              padding: '8px 16px',
              backgroundColor: '#fff',
              color: '#000',
              fontWeight: 800,
              border: '2px solid #000',
              borderRadius: '4px',
              boxShadow: '2px 2px 0px #000',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Inject Delays in Simulator &rarr;
          </Link>
        </div>
      </section>

      {/* 2. THE PROBLEM (SIMPLE & PUNCHY FOR EVERY CITIZEN) */}
      <section className={styles.problemSection} aria-labelledby="problem-title">
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>Why Citizens Struggle</span>
          <h2 id="problem-title" className={styles.sectionTitle}>
            7 Common RTO Headaches Every Driver Faces
          </h2>
          <p className={styles.sectionSubtitle}>
            Government websites like Sarathi and Vahan don’t tell you the right order of steps.
            Here is what often goes wrong:
          </p>
        </div>

        <ul className={styles.problemList}>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>01</span>
            <div>
              <h3 className={styles.problemHeading}>Multiple Confusing Websites</h3>
              <p className={styles.problemDesc}>
                Sarathi handles driving licences, Vahan handles vehicles, and state portals handle
                road taxes. Neither website tells you which application you must finish first.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>02</span>
            <div>
              <h3 className={styles.problemHeading}>Silent Blocked Applications</h3>
              <p className={styles.problemDesc}>
                An old unpaid challan or an open loan clearance form silently freezes your new
                request with a cryptic error like &ldquo;Transaction Pending&rdquo;.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>03</span>
            <div>
              <h3 className={styles.problemHeading}>The Address Change Trap</h3>
              <p className={styles.problemDesc}>
                Update your Aadhaar address too early, and your old RTO rejects your vehicle NOC.
                Update too late, and you have no address proof. Timing is critical!
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>04</span>
            <div>
              <h3 className={styles.problemHeading}>Hidden Government Delays</h3>
              <p className={styles.problemDesc}>
                Applying online isn’t instant. Physical document checks, slot queues, and postal
                delivery add weeks of delay that portals never warn you about.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>05</span>
            <div>
              <h3 className={styles.problemHeading}>Vacation &amp; Travel Clashes</h3>
              <p className={styles.problemDesc}>
                Booking an in-person driving test or vehicle inspection on dates you’re out of town
                cancels your slot and resets your waiting queue.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>06</span>
            <div>
              <h3 className={styles.problemHeading}>Exposing Private Family Documents</h3>
              <p className={styles.problemDesc}>
                Sending photos of registration certificates and licences over WhatsApp leaks Aadhaar
                numbers, chassis IDs, and sensitive personal information.
              </p>
            </div>
          </li>
          <li className={styles.problemItem}>
            <span className={styles.problemIndex}>07</span>
            <div>
              <h3 className={styles.problemHeading}>Unclear State Rules &amp; Fees</h3>
              <p className={styles.problemDesc}>
                Road tax and renewal fees vary wildly by state. Fake agent sites overcharge citizens
                because official fee rules are buried in gazette PDFs.
              </p>
            </div>
          </li>
        </ul>
      </section>

      {/* 3. HOW THE PLAN WORKS (8 CLEAR STEPS) */}
      <section
        ref={walkthroughRef}
        className={styles.walkthroughSection}
        aria-labelledby="walkthrough-title"
      >
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>How Pravaah Helps</span>
          <h2 id="walkthrough-title" className={styles.sectionTitle}>
            How Pravaah Builds Your Stress-Free Plan
          </h2>
          <p className={styles.sectionSubtitle}>
            A completely transparent, automatic process that runs directly on your computer:
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
            <span className={styles.trapWarningTag}>⚠️ IMPORTANT MOVE ALERT</span>
            <span className={styles.trapRuleTag}>Order of Documents</span>
          </div>
          <h2 id="trap-title" className={styles.trapTitle}>
            The Moving Trap: Don’t Change Aadhaar Address Before Your NOC!
          </h2>
          <p className={styles.trapExplanation}>
            When moving between states, you need proof of your new address. Many citizens update
            their Aadhaar address first. But beware: your <strong>old RTO</strong> verifies that your
            address still matches your vehicle RC before granting your Form 28 NOC. If you update
            Aadhaar early, your NOC gets rejected! Pravaah automatically sequences your NOC first,
            saving you weeks of delays and re-application fees.
          </p>

          <div className={styles.trapDiagram} aria-label="Address update dependency chain">
            <div className={styles.diagramNode}>
              <span className={styles.nodeKind}>Step 1 • Vehicle NOC</span>
              <strong>Form 28 NOC</strong>
              <small>Issued by your Old RTO</small>
            </div>
            <div className={styles.diagramArrow}>
              <span>then (needs)</span>
              <div className={styles.arrowLine} />
            </div>
            <div className={`${styles.diagramNode} ${styles.diagramNodeAlert}`}>
              <span className={styles.nodeKind}>Step 2 • Address Update</span>
              <strong>Aadhaar Address Change</strong>
              <small>Safe to update only after NOC</small>
            </div>
            <div className={styles.diagramArrow}>
              <span>then unlocks</span>
              <div className={styles.arrowLine} />
            </div>
            <div className={styles.diagramNode}>
              <span className={styles.nodeKind}>Step 3 • Licence Renewal</span>
              <strong>DL Address &amp; Renewal</strong>
              <small>Online via new Aadhaar address</small>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ARCHITECTURE */}
      <section className={styles.architectureSection} aria-labelledby="arch-title">
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>Technical Design</span>
          <h2 id="arch-title" className={styles.sectionTitle}>
            Fast &amp; 100% Private (Runs in Your Browser)
          </h2>
          <p className={styles.sectionSubtitle}>
            No external server calls. All dependency math and scheduling calculations run
            deterministically right on your device.
          </p>
        </div>

        <Suspense fallback={<div style={{ minHeight: '360px', background: 'var(--paper-warm)' }} />}>
          <ArchitectureStack />
        </Suspense>
      </section>

      {/* 6. HONEST BY DESIGN */}
      <section className={styles.honestSection} aria-labelledby="honest-title">
        <div className={styles.sectionHeader}>
          <span className={styles.kicker}>Trust &amp; Transparency</span>
          <h2 id="honest-title" className={styles.sectionTitle}>
            Honest by Design: Verified Legal Rules
          </h2>
          <p className={styles.sectionSubtitle}>
            Every fee and rule displays its exact legal citation from the Motor Vehicle Act.
          </p>
        </div>

        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{sourcesCount}</span>
            <span className={styles.statLabel}>Official Laws &amp; Portals</span>
            <p className={styles.statDesc}>
              India Code, MoRTH, Central Motor Vehicle Rules (CMVR), and State Transport Gazettes.
            </p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{unverifiedCount}</span>
            <span className={styles.statLabel}>Pending Manual Verification</span>
            <p className={styles.statDesc}>
              We clearly mark modelled rules so citizens know what is statutory versus assumed.
            </p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{daysRemaining}d</span>
            <span className={styles.statLabel}>Days to Expiry (Scenario A)</span>
            <p className={styles.statDesc}>
              Simulated scenario countdown showing buffer days and latest safe action dates.
            </p>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>0</span>
            <span className={styles.statLabel}>Server Data Tracking</span>
            <p className={styles.statDesc}>
              Your documents and personal information never leave your local device.
            </p>
          </div>
        </div>

        <div className={styles.honestLinkRow}>
          <Link to="/sources" className={styles.honestLink}>
            Inspect all official legal sources &rarr;
          </Link>
        </div>
      </section>

      {/* 7. CLOSING CTA */}
      <section className={styles.ctaSection} aria-labelledby="cta-title">
        <div className={styles.ctaCard}>
          <span className={styles.kicker}>Ready to Try?</span>
          <h2 id="cta-title" className={styles.ctaTitle}>
            Take Control of Your Transport Compliance
          </h2>
          <p className={styles.ctaSubtitle}>
            Open the smart roadmap, test sudden schedule disruptions in our sandbox, or manage your
            family fleet with privacy-preserving masked records.
          </p>

          <div className={styles.ctaButtonGroup}>
            <MagneticButton href="/plan" variant="primary">
              ⚡ Open Smart Roadmap
            </MagneticButton>
            <MagneticButton href="/simulate" variant="secondary">
              🧪 Disruption Simulator
            </MagneticButton>
            <MagneticButton href="/household" variant="secondary">
              👥 Family Garage
            </MagneticButton>
            <MagneticButton href="/voice" variant="secondary">
              🎙️ Plate &amp; Voice Tool
            </MagneticButton>
            <MagneticButton href="/metrics" variant="secondary">
              📊 System Metrics
            </MagneticButton>
          </div>
        </div>
      </section>

      {/* FOOTER NOTE */}
      <div className={styles.storyFooter}>
        <p>
          Pravaah (प्रवाह) • Designed for IMPACTX 2026 Challenge 09: &ldquo;Vehicle &amp; Driving
          Services Made Simple&rdquo;.
        </p>
      </div>
    </div>
  );
};

export default StoryPage;
