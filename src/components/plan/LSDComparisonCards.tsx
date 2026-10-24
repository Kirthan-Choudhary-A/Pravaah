import React from 'react';
import type { OptionComparison, LicenceRouteDecision } from '@engine/model/types';
import { StatusTag } from '@components/ui/StatusTag';
import { UnverifiedMark } from '@components/ui/UnverifiedMark';
import styles from './LSDComparisonCards.module.css';

export interface LSDComparisonCardsProps {
  readonly options: readonly OptionComparison[];
  readonly currentDecision?: LicenceRouteDecision;
  readonly onSelectRoute?: (routeId: LicenceRouteDecision) => void;
  readonly className?: string;
}

const ROUTE_TITLES: Record<LicenceRouteDecision, string> = {
  online: 'Aadhaar Online Renewal',
  'rto-visit': 'Primary RTO In-Person Visit',
  'another-rto': 'Alternative RTO (Fast Slot)',
  'another-date': 'Deferred Post-Absence Date',
};

export const LSDComparisonCards: React.FC<LSDComparisonCardsProps> = ({
  options,
  currentDecision,
  onSelectRoute,
  className = '',
}) => {
  return (
    <div className={`${styles.wrapper ?? ''} ${className}`.trim()}>
      <div className={styles.header}>
        <div>
          <h4 className={styles.title}>Statutory Route Comparison & Trade-Offs</h4>
          <span className={styles.subtitle}>
            Evaluating all 4 route configurations against statutory deadlines and absence window
          </span>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        {options.map((option, idx) => {
          const routeId = option.decisions.licenceRoute;
          const form35Id = option.decisions.form35;
          const isSelected = currentDecision === routeId;
          const isRecommended = option.rank === 1;
          const routeName = ROUTE_TITLES[routeId] || routeId;
          const form35Suffix =
            form35Id === 'withdraw'
              ? ' [Withdraw F35]'
              : form35Id === 'resolve'
                ? ' [Bank Consent]'
                : ' [Wait F35]';
          const title = `${routeName}${form35Suffix}`;
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
                    <span className={styles.rankBadge}>Rank #{option.rank}</span>
                    {isRecommended && <span className={styles.recommendedBadge}>RECOMMENDED</span>}
                    {isSelected && <span className={styles.activePill}>CURRENT PLAN</span>}
                  </div>
                  <h5 className={styles.cardTitle}>{title}</h5>
                </div>
                <StatusTag status={status} size="sm" />
              </div>

              <div className={styles.metricsRow}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Expected Finish</span>
                  <span className={styles.metricValue}>Day {option.expectedPlan.finish}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Slow Run Finish</span>
                  <span className={styles.metricValue}>Day {option.slowPlan.finish}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Visits</span>
                  <span className={styles.metricValue}>{option.visitCount}</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Deadline Breaches</span>
                  <span
                    className={`${styles.metricValue ?? ''} ${
                      option.deadlineBreaches > 0
                        ? (styles.slackNeg ?? '')
                        : (styles.slackPos ?? '')
                    }`}
                  >
                    {option.deadlineBreaches}
                  </span>
                </div>
              </div>

              <div className={styles.tradeOffBox}>
                <span className={styles.tradeOffLabel}>Key Trade-Off:</span>
                <p className={styles.tradeOffText}>{option.tradeOff}</p>
              </div>

              <p className={styles.fallbackLine}>
                <strong>Contingency:</strong> {option.fallbackLine}
              </p>

              {option.unverifiedRuleImpact && (
                <div className={styles.unverifiedBox}>
                  <UnverifiedMark />
                  <span className={styles.unverifiedImpactText}>{option.unverifiedRuleImpact}</span>
                </div>
              )}

              {onSelectRoute && (
                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    disabled={isSelected}
                    onClick={() => onSelectRoute(routeId)}
                    className={`${styles.selectBtn ?? ''} ${
                      isSelected ? (styles.selectBtnActive ?? '') : ''
                    }`}
                  >
                    {isSelected ? '✓ Selected Route' : 'Select this Route'}
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
