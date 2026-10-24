import React from 'react';
import { NavLink } from 'react-router-dom';
import { SITE_CONFIG } from '@config/site.config';
import styles from './AppShell.module.css';

export interface SidebarProps {
  readonly open: boolean;
  readonly onNavigate: () => void;
  readonly onOpenDemoGuide: () => void;
  readonly onResetDemo: () => void;
}

const GROUPS = ['Workspace', 'People and vehicles', 'Evidence', 'About'] as const;

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  onNavigate,
  onOpenDemoGuide,
  onResetDemo,
}) => (
  <aside
    id="app-sidebar"
    className={`${styles.sidebar ?? ''} ${open ? (styles.sidebarOpen ?? '') : ''}`.trim()}
    aria-label="Application"
  >
    <NavLink to="/" className={styles.brand ?? ''} onClick={onNavigate}>
      <span className={styles.brandName}>{SITE_CONFIG.name}</span>
      <span className={styles.brandHindi} aria-hidden="true">
        प्रवाह
      </span>
    </NavLink>

    <nav className={styles.nav} aria-label="Main navigation">
      {GROUPS.map((group) => (
        <div key={group} className={styles.navGroup}>
          <span className={styles.navGroupLabel}>{group}</span>
          {SITE_CONFIG.routes
            .filter((r) => r.group === group)
            .map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                end={route.path === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navLink ?? ''} ${styles.navLinkActive ?? ''}`
                    : (styles.navLink ?? '')
                }
              >
                {route.label}
              </NavLink>
            ))}
        </div>
      ))}
    </nav>

    <div className={styles.sidebarFoot}>
      <button
        type="button"
        className={styles.sideButton}
        onClick={onOpenDemoGuide}
        aria-label="Open the guided demo"
      >
        Guided demo
      </button>
      <button
        type="button"
        className={styles.sideButton}
        onClick={onResetDemo}
        aria-label="Reset demo state to Scenario A defaults"
        title="Clear consents, audit logs, and reset parameters"
      >
        Reset demo
      </button>
    </div>
  </aside>
);
