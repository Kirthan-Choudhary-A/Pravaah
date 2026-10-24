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

export const Layout: React.FC = () => {
  const { scenarioId, setScenarioId } = usePlan();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoGuideOpen, setDemoGuideOpen] = useState(false);

  const scenarioOptions = useMemo(
    () =>
      SCENARIO_IDS.map((id) => {
        const m = loadScenario(id).move;
        return { id, label: `${id}: ${m.fromRTO} → ${m.toRTO}` };
      }),
    []
  );

  // Close the drawer when the page changes or Escape is pressed.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className={styles.shell}>
      <SkipLink />
      <Sidebar
        open={menuOpen}
        onNavigate={() => setMenuOpen(false)}
        onOpenDemoGuide={() => {
          setMenuOpen(false);
          setDemoGuideOpen(true);
        }}
        onResetDemo={() => {
          setMenuOpen(false);
          resetDemoStorage();
        }}
      />
      {menuOpen && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className={styles.workspace}>
        <Topbar
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((o) => !o)}
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
