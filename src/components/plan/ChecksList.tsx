import React from 'react';
import type { CheckResult } from '@engine/model/types';
import { StatusTag } from '@components/ui/StatusTag';
import styles from './ChecksList.module.css';

export interface ChecksListProps {
  readonly checks: readonly CheckResult[];
  readonly className?: string;
}

export const ChecksList: React.FC<ChecksListProps> = ({ checks, className = '' }) => {
  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <div className={`${styles.wrapper ?? ''} ${className}`.trim()}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h4 className={styles.title}>Modelled Compliance Checks</h4>
          <span className={styles.subtitle}>
            {passedCount} of {checks.length} modelled checks passed (rules unverified)
          </span>
        </div>
        <span className={styles.scoreBadge}>
          {passedCount === checks.length
            ? 'All Clear'
            : `${checks.length - passedCount} Attention Required`}
        </span>
      </div>

      <ul className={styles.list} aria-label="Compliance checks list">
        {checks.map((check) => (
          <li
            key={check.id}
            className={`${styles.item ?? ''} ${
              check.passed ? (styles.itemPassed ?? '') : (styles.itemFailed ?? '')
            }`}
          >
            <div className={styles.itemHeader}>
              <div className={styles.checkTitleGroup}>
                <span className={styles.checkId}>{check.id}</span>
                <h5 className={styles.checkTitle}>{check.ruleName}</h5>
                <span className={styles.sourceTag}>{check.sourceName}</span>
              </div>
              <StatusTag status={check.passed ? 'safe' : 'missed'} size="sm" />
            </div>

            <p className={styles.explanation}>{check.message}</p>

            {check.details && (
              <div className={styles.remedyBox}>
                <span className={styles.remedyLabel}>Details / Guidance:</span>
                <p className={styles.remedyText}>{check.details}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
