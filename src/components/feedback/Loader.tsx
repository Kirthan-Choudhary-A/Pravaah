import React from 'react';
import styles from './Loader.module.css';

export interface LoaderProps {
  readonly message?: string;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  message = 'Loading...',
  size = 'md',
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${styles.container} ${styles[size]} ${className}`.trim()}
    >
      <div className={styles.spinner} aria-hidden="true" />
      <span className={styles.message}>{message}</span>
    </div>
  );
};
