import React from 'react';
import styles from './UnverifiedMark.module.css';

export interface UnverifiedMarkProps {
  readonly className?: string;
  readonly label?: string;
}

export const UnverifiedMark: React.FC<UnverifiedMarkProps> = ({
  className = '',
  label = 'unverified',
}) => {
  return (
    <span
      className={`${styles.mark} ${className}`.trim()}
      title="Value has not yet been confirmed against official gazette / portal"
    >
      {label}
    </span>
  );
};
