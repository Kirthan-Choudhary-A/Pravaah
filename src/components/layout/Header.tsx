import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { SITE_CONFIG } from '@config/site.config';
import { resetDemoStorage } from '@utils/demoReset';
import { DemoGuidePanel } from '../demo/DemoGuidePanel';
import { MobileMenu } from './MobileMenu';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoGuideOpen, setDemoGuideOpen] = useState(false);

  const handleResetDemo = () => {
    resetDemoStorage();
  };

  return (
    <>
      <header className={styles.header} role="banner">
        <div className={styles.inner}>
          <div className={styles.brandGroup}>
            <NavLink to="/" className={styles.brandLink ?? ''}>
              <span className={styles.brandTitle}>{SITE_CONFIG.name}</span>
              <span className={styles.brandHindi} aria-hidden="true">
                प्रवाह
              </span>
            </NavLink>
            <span
              className={styles.simulatedBadge}
              title="All data in this prototype is simulated"
            >
              SIMULATED
            </span>
          </div>

          <nav className={styles.desktopNav} aria-label="Main navigation">
            {SITE_CONFIG.routes.map((route) => (
              <NavLink
                key={route.path}
                to={route.path}
                className={({ isActive }) =>
                  isActive
                    ? `${styles.navLink ?? ''} ${styles.navLinkActive ?? ''}`
                    : (styles.navLink ?? '')
                }
                end={route.path === '/'}
              >
                {route.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.headerActions}>
            <button
              type="button"
              onClick={() => setDemoGuideOpen((prev) => !prev)}
              className={styles.demoGuideBtn}
              aria-label="Toggle judge demo guide walkthrough"
              title="Toggle guided demo mode"
            >
              Demo guide
            </button>
            <button
              type="button"
              onClick={handleResetDemo}
              className={styles.resetDemoBtn}
              aria-label="Reset demo state to Scenario A defaults"
              title="Clear consents, audit logs, and reset parameters"
            >
              Reset demo
            </button>

            <button
              type="button"
              className={styles.hamburgerButton}
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-label="Open navigation menu"
            >
              <span className={styles.hamburgerBar} />
              <span className={styles.hamburgerBar} />
              <span className={styles.hamburgerBar} />
            </button>
          </div>
        </div>

        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onOpenDemoGuide={() => {
            setMobileMenuOpen(false);
            setDemoGuideOpen(true);
          }}
          onResetDemo={() => {
            setMobileMenuOpen(false);
            handleResetDemo();
          }}
        />
      </header>

      <DemoGuidePanel
        isOpen={demoGuideOpen}
        onClose={() => setDemoGuideOpen(false)}
      />
    </>
  );
};
