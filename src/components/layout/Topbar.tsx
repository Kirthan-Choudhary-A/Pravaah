import React from 'react';
import { SITE_CONFIG } from '@config/site.config';
import styles from './AppShell.module.css';

export interface TopbarProps {
  readonly menuOpen: boolean;
  readonly onToggleMenu: () => void;
  readonly scenarioId: string;
  readonly scenarioOptions: readonly { readonly id: string; readonly label: string }[];
  readonly onScenarioChange: (id: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  menuOpen,
  onToggleMenu,
  scenarioId,
  scenarioOptions,
  onScenarioChange,
}) => {
  return (
    <header className={styles.topbar} role="banner">
      <button
        type="button"
        className={styles.menuButton}
        onClick={onToggleMenu}
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
      >
        <span className={styles.menuBar} />
        <span className={styles.menuBar} />
        <span className={styles.menuBar} />
      </button>

      <span className={styles.topbarBrand}>{SITE_CONFIG.name}</span>

      <div className={styles.topbarTools}>
        <label className={styles.scenarioField}>
          <span className={styles.scenarioLabel}>Scenario</span>
          <select
            className={styles.scenarioSelect}
            value={scenarioId}
            onChange={(e) => onScenarioChange(e.target.value)}
          >
            {scenarioOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.simulatedChip} title="All data in this prototype is simulated">
          SIMULATED
        </span>
      </div>
    </header>
  );
};
