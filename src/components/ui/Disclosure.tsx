import React, { useState } from 'react';
import styles from './Disclosure.module.css';

export interface DisclosureProps {
  readonly title: React.ReactNode;
  readonly badge?: React.ReactNode;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export const Disclosure: React.FC<DisclosureProps> = ({
  title,
  badge,
  defaultOpen = false,
  children,
  className = '',
}) => {
  // Content mounts only while open: charts that measure their container (the dependency graph)
  // render blank when created inside a collapsed section.
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={`${styles.details} ${className}`.trim()}
      open={defaultOpen}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className={styles.summary}>
        <span className={styles.summaryTitle}>{title}</span>
        <div className={styles.metaGroup}>
          {badge && <span className={styles.badge}>{badge}</span>}
          <span className={styles.arrow} aria-hidden="true">
            ▼
          </span>
        </div>
      </summary>
      <div className={styles.content}>{open ? children : null}</div>
    </details>
  );
};
