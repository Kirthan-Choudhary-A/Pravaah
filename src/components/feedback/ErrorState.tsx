import React from 'react';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  readonly title?: string;
  readonly error: Error | string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  error,
  onRetry,
  className = '',
}) => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div role="alert" className={`${styles.container} ${className}`.trim()}>
      <div className={styles.icon} aria-hidden="true">
        !
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{errorMessage}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={styles.retryButton}>
          Try Again
        </button>
      )}
    </div>
  );
};
