import React from 'react';
import type { OptionComparison, LicenceRouteDecision, Decisions } from '@engine/model/types';
import { StatusTag } from '@components/ui/StatusTag';
import { UnverifiedMark } from '@components/ui/UnverifiedMark';
import styles from './LSDComparisonCards.module.css';

export interface LSDComparisonCardsProps {
  readonly options: readonly OptionComparison[];
  /** The choices the plan currently uses. */
  readonly current?: Decisions;
  readonly onSelect?: (decisions: Decisions) => void;
  /** Show only the best N options. */
  readonly limit?: number;
  readonly className?: string;
}

const ROUTE_TITLES: Record<LicenceRouteDecision, string> = {
  online: 'Renew online with Aadhaar',
  'rto-visit': 'Renew at the RTO',
  'another-rto': 'Renew at another RTO',
  'another-date': 'Renew at the RTO after your trip',
};

const FORM35_TITLES = {
  resolve: 'resolve Form 35 by grievance',
  withdraw: 'withdraw Form 35',
  wait: 'wait for Form 35',
} as const;

export const LSDComparisonCards: React.FC<LSDComparisonCardsProps> = ({
  options,
  current,
  onSelect,
  limit,
  className = '',
}) => {
  const shown = limit ? options.slice(0, limit) : options;
  return (
    <div className={`${styles.wrapper ?? ''} ${className}`.trim()}>
      <div className={styles.cardsGrid}>
        {shown.map((option, idx) => {
          const routeId = option.decisions.licenceRoute;
          const form35Id = option.decisions.form35;
          const isSelected =
            current !== undefined &&
            current.licenceRoute === routeId &&
            current.form35 === form35Id;
          const isRecommended = option.rank === 1;
          const routeName = ROUTE_TITLES[routeId] || routeId;
          const title = `${routeName}; ${FORM35_TITLES[form35Id]}`;
          const status = option.deadlineBreaches === 0 ? 'safe' : 'risk';

          return (
            <div
              key={`${form35Id}-${routeId}-${idx}`}
              className={`${styles.card ?? ''} ${isSelected ? (styles.cardSelected ?? '') : ''} ${
                isRecommended ? (styles.cardRecommended ?? '') : ''
              }`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleGroup}>
                  <div className={styles.badgesRow}>
                    {isRecommended && <span className={styles.recommendedBadge}>Recommended</span>}
                    {isSelected && <span className={styles.activePill}>Your plan now</span>}
                  </div>
                  <h5 className={styles.cardTitle}>{title}</h5>
                </div>
                <StatusTag status={status} size="sm" />
              </div>

              <p className={styles.summaryLine}>
                Everything done by day {option.expectedPlan.finish} (day {option.slowPlan.finish} if
                things go slowly). {option.visitCount} RTO{' '}
                {option.visitCount === 1 ? 'visit' : 'visits'}.
                {option.licenceLapseDays > 0
                  ? ` The licence would lapse by ${option.licenceLapseDays} days.`
                  : ' The licence stays valid.'}
              </p>

              {option.unverifiedRuleImpact && (
                <div className={styles.unverifiedBox}>
                  <UnverifiedMark />
                  <span className={styles.unverifiedImpactText}>{option.unverifiedRuleImpact}</span>
                </div>
              )}

              {onSelect && (
                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    disabled={isSelected}
                    onClick={() => onSelect(option.decisions)}
                    className={`${styles.selectBtn ?? ''} ${
                      isSelected ? (styles.selectBtnActive ?? '') : ''
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Use this plan'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
