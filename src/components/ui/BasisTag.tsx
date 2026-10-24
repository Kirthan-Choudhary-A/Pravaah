import React from 'react';
import type { RuleBasis } from '@engine/model/types';
import styles from './BasisTag.module.css';

export interface BasisTagProps {
  readonly basis: RuleBasis | string;
  readonly className?: string;
}

const BASIS_LABELS: Record<string, string> = {
  statute: 'Statute',
  notification: 'Notification',
  'state-portal': 'State Portal',
  modelled: 'modelled rule (assumed)',
};

export const BasisTag: React.FC<BasisTagProps> = ({ basis, className = '' }) => {
  const isModelled = basis === 'modelled';
  const label = BASIS_LABELS[basis] ?? basis;

  return (
    <span
      className={`${styles.tag} ${isModelled ? styles.modelled : styles.official} ${className}`.trim()}
      title={isModelled ? 'This rule is modelled/assumed in simulation' : `Legal basis: ${label}`}
    >
      {label}
    </span>
  );
};
