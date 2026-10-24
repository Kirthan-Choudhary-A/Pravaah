import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { SITE_CONFIG } from '@config/site.config';
import { MobileMenu } from './MobileMenu';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        <div className={styles.brandGroup}>
          <NavLink to="/" className={styles.brandLink ?? ''}>
            <span className={styles.brandTitle}>{SITE_CONFIG.name}</span>
            <span className={styles.brandHindi} aria-hidden="true">
              प्रवाह
            </span>
          </NavLink>
          <span className={styles.simulatedBadge} title="All data in this prototype is simulated">
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

      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </header>
  );
};
