import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '@config/site.config';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <div className={styles.mainInfo}>
          <div className={styles.brandRow}>
            <span className={styles.brandName}>{SITE_CONFIG.name}</span>
            <span className={styles.brandTagline}>{SITE_CONFIG.tagline}</span>
          </div>
          <p className={styles.notice}>{SITE_CONFIG.simulatedNotice}</p>
        </div>

        <div className={styles.linksRow}>
          <Link to="/sources" className={styles.footerLink}>
            Official Sources & Rules
          </Link>
          <span className={styles.divider} aria-hidden="true">
            •
          </span>
          <span className={styles.challenge}>{SITE_CONFIG.challenge}</span>
        </div>
      </div>
    </footer>
  );
};
