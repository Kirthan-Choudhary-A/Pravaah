import React from 'react';
import styles from './SkipLink.module.css';

export interface SkipLinkProps {
  readonly targetId?: string;
  readonly label?: string;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId = 'main-content',
  label = 'Skip to main content',
}) => {
  return (
    <a href={`#${targetId}`} className={styles.skipLink}>
      {label}
    </a>
  );
};
