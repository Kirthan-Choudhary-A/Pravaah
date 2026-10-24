import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { SITE_CONFIG } from '@config/site.config';
import styles from './MobileMenu.module.css';

export interface MobileMenuProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus on close
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Prevent background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button initially
    firstFocusableRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} role="presentation" data-testid="mobile-menu-backdrop">
      <button
        type="button"
        className={styles.backdropButton}
        onClick={onClose}
        aria-label="Close navigation overlay"
        tabIndex={-1}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={styles.dialog}
      >
        <div className={styles.header}>
          <span className={styles.title}>{SITE_CONFIG.name}</span>
          <button
            ref={firstFocusableRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className={styles.nav} aria-label="Mobile site navigation">
          {SITE_CONFIG.routes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) =>
                isActive ? `${styles.link ?? ''} ${styles.linkActive ?? ''}` : (styles.link ?? '')
              }
              end={route.path === '/'}
              onClick={onClose}
            >
              {route.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.footer}>
          <span className={styles.simulatedPill}>SIMULATED</span>
          <p className={styles.disclaimer}>{SITE_CONFIG.simulatedNotice}</p>
        </div>
      </div>
    </div>
  );
};
