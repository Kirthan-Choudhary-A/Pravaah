import React from 'react';
import type { FeeSummary } from '@engine/model/types';
import { UnverifiedMark } from '@components/ui/UnverifiedMark';
import styles from './FeesTable.module.css';

export interface FeesTableProps {
  readonly fees: FeeSummary;
  readonly isDegraded?: boolean;
  readonly stateName?: string;
  readonly className?: string;
}

export const FeesTable: React.FC<FeesTableProps> = ({
  fees,
  isDegraded = false,
  stateName = 'the destination state',
  className = '',
}) => {
  if (isDegraded) {
    return (
      <div className={`${styles.wrapper ?? ''} ${className}`.trim()}>
        <div className={styles.header}>
          <h4 className={styles.title}>Statutory Fee Schedule</h4>
        </div>
        <div className={styles.degradedBox}>
          <p className={styles.degradedText}>
            Rules unknown – confirm with the RTO for {stateName}.
          </p>
          <p className={styles.degradedSub}>
            No state-specific fee amounts are invented or estimated in degraded mode. Please refer
            to official portal links.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper ?? ''} ${className}`.trim()}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h4 className={styles.title}>Statutory & Administrative Fee Breakdown</h4>
          <span className={styles.subtitle}>
            Itemized breakdown of official application fees and estimated statutory costs
          </span>
        </div>
        {fees.hasUnverified && <UnverifiedMark label="Fee Rules Unverified" />}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>Itemized Fee Schedule</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.th}>
                Fee Item
              </th>
              <th scope="col" className={styles.th}>
                Classification
              </th>
              <th scope="col" className={`${styles.th ?? ''} ${styles.thRight ?? ''}`}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {fees.items.map((item, idx) => (
              <tr key={`${item.id}-${idx}`}>
                <td className={styles.td}>
                  <div className={styles.itemNameGroup}>
                    <span className={styles.itemName}>{item.label}</span>
                    {!item.verified && <UnverifiedMark />}
                  </div>
                  {item.note && <span className={styles.itemNote}>{item.note}</span>}
                </td>
                <td className={styles.td}>
                  <span className={styles.lanePill}>{item.tag}</span>
                </td>
                <td className={`${styles.td ?? ''} ${styles.tdRight ?? ''}`}>
                  <span className={styles.itemAmount}>
                    {item.amount !== null
                      ? `₹${item.amount.toLocaleString('en-IN')}`
                      : 'Variable / RTO confirmation'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.footerRow}>
              <td colSpan={2} className={styles.footerLabel}>
                Official Total:
              </td>
              <td className={`${styles.footerValue ?? ''} ${styles.tdRight ?? ''}`}>
                ₹{fees.officialTotal.toLocaleString('en-IN')}
              </td>
            </tr>
            {fees.estimateCount > 0 && (
              <tr className={styles.footerRow}>
                <td
                  colSpan={2}
                  className={`${styles.footerLabel ?? ''} ${styles.penaltyLabel ?? ''}`}
                >
                  Variable / Estimated Items:
                </td>
                <td
                  className={`${styles.footerValue ?? ''} ${styles.tdRight ?? ''} ${styles.penaltyValue ?? ''}`}
                >
                  {fees.estimateCount} items
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  );
};
