import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { usePlan } from '@state/PlanContext';
import { loadScenario } from '@data';
import { SITE_CONFIG } from '@config/site.config';
import { resetDemoStorage } from '@utils/demoReset';
import { DemoGuidePanel } from '@components/demo/DemoGuidePanel';
import { Sidebar } from '@components/layout/Sidebar';
import { Topbar } from '@components/layout/Topbar';
import { SkipLink } from '@components/layout/SkipLink';
import { AssistantPanel } from '@features/assistant/AssistantPanel';
import styles from '@components/layout/AppShell.module.css';

const SCENARIO_IDS = ['A', 'B', 'C'] as const;
type ScenarioKey = (typeof SCENARIO_IDS)[number];

const NARROW_QUERY = '(max-width: 56rem)';
const NAV_PREF_KEY = 'pravaah_nav_open';

const isNarrow = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(NARROW_QUERY).matches;

/** Desktop remembers whether the sidebar was left open; phones always start with it closed. */
const initialNavOpen = (): boolean => {
  if (isNarrow()) return false;
  try {
    return localStorage.getItem(NAV_PREF_KEY) !== '0';
  } catch {
    return true;
  }
};

export const Layout: React.FC = () => {
  const { scenarioId, setScenarioId } = usePlan();
  const { pathname } = useLocation();
  const [narrow, setNarrow] = useState(isNarrow);
  const [navOpen, setNavOpen] = useState(initialNavOpen);
  const [demoGuideOpen, setDemoGuideOpen] = useState(false);

  const scenarioOptions = useMemo(
    () =>
      SCENARIO_IDS.map((id) => {
        const m = loadScenario(id).move;
        return { id, label: `${id}: ${m.fromRTO} → ${m.toRTO}` };
      }),
    []
  );

  // Switching between phone and desktop width resets the sidebar sensibly.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(NARROW_QUERY);
    const onChange = () => {
      setNarrow(mq.matches);
      setNavOpen(mq.matches ? false : initialNavOpen());
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // On a phone the drawer closes when the page changes or Escape is pressed.
  useEffect(() => {
    if (narrow) setNavOpen(false);
  }, [pathname, narrow]);
  useEffect(() => {
    if (!narrow || !navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [narrow, navOpen]);

  const toggleNav = () =>
    setNavOpen((open) => {
      const next = !open;
      if (!narrow) {
        try {
          localStorage.setItem(NAV_PREF_KEY, next ? '1' : '0');
        } catch {
          // not essential
        }
      }
      return next;
    });
  const closeOnPhone = () => narrow && setNavOpen(false);

  return (
    <div className={`${styles.shell ?? ''} ${navOpen ? '' : (styles.shellCollapsed ?? '')}`.trim()}>
      <SkipLink />
      <Sidebar
        open={navOpen}
        onNavigate={closeOnPhone}
        onOpenDemoGuide={() => {
          closeOnPhone();
          setDemoGuideOpen(true);
        }}
        onResetDemo={() => {
          closeOnPhone();
          resetDemoStorage();
        }}
      />
      {narrow && navOpen && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close navigation menu"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className={styles.workspace}>
        <Topbar
          menuOpen={navOpen}
          onToggleMenu={toggleNav}
          scenarioId={scenarioId}
          scenarioOptions={scenarioOptions}
          onScenarioChange={(id) => setScenarioId(id as ScenarioKey)}
        />
        <main id="main-content" tabIndex={-1} className={styles.content}>
          <Outlet />
        </main>
        <footer className={styles.statusBar} role="contentinfo">
          {SITE_CONFIG.simulatedNotice}
        </footer>
      </div>

      <DemoGuidePanel isOpen={demoGuideOpen} onClose={() => setDemoGuideOpen(false)} />
      <AssistantPanel />
    </div>
  );
};
