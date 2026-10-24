import React from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  readonly title: string;
  readonly message?: string;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  action,
  className = '',
}) => {
  return (
    <div className={`${styles.container} ${className}`.trim()}>
      <div className={styles.icon} aria-hidden="true">
        ∅
      </div>
      <h3 className={styles.title}>{title}</h3>
      {message && <p className={styles.message}>{message}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
