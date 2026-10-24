import React from 'react';
import type { RulePack, LicenceStageRow } from '@engine/model/types';
import { licenceStages } from '@engine/checks/complianceChecks';
import { DataTable, type Column } from '@components/ui/DataTable';
import { UnverifiedMark } from '@components/ui/UnverifiedMark';
import styles from './LicenceStagesTable.module.css';

export interface LicenceStagesTableProps {
  readonly pack: RulePack;
  readonly expiryDay: number;
  readonly className?: string;
}

export const LicenceStagesTable: React.FC<LicenceStagesTableProps> = ({
  pack,
  expiryDay,
  className = '',
}) => {
  const rows = licenceStages(pack, expiryDay);
  const isUnverified = !pack.licenceStages.verified;

  const columns: readonly Column<LicenceStageRow>[] = [
    {
      key: 'stage',
      header: 'Stage Name',
      render: (r) => <span className={styles.stageName}>{r.stage}</span>,
    },
    {
      key: 'interval',
      header: 'Time Window',
      render: (r) => <span className={styles.monoCell}>{r.interval}</span>,
    },
    {
      key: 'drivingAllowed',
      header: 'Driving Permitted',
      render: (r) => (
        <span
          className={`${styles.boolBadge ?? ''} ${
            r.drivingAllowed ? (styles.boolPermitted ?? '') : (styles.boolProhibited ?? '')
          }`}
        >
          {r.drivingAllowed ? '✓ Permitted' : '✕ Prohibited'}
        </span>
      ),
    },
    {
      key: 'fees',
      header: 'Late Fee',
      render: (r) => (
        <div className={styles.feeGroup}>
          <span className={styles.feeCode}>
            {r.lateFeeAmount > 0 ? `+₹${r.lateFeeAmount} late fee` : 'Standard fee'}
          </span>
          {isUnverified && <UnverifiedMark />}
        </div>
      ),
    },
    {
      key: 'test',
      header: 'Driving Test',
      render: (r) => (
        <span className={r.testRequired ? styles.testRequired : styles.testNotRequired}>
          {r.testRequired ? 'Mandatory Retest' : 'No Test'}
        </span>
      ),
    },
    {
      key: 'note',
      header: 'Note (modelled)',
      render: (r) => <span className={styles.noteCell}>{r.note}</span>,
    },
  ];

  return (
    <div className={`${styles.wrapper ?? ''} ${className}`.trim()}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h4 className={styles.title}>Driving Licence Renewal Stages</h4>
          <span className={styles.subtitle}>
            Derived from single config set (s.14/s.15 MV Act). Grace period:{' '}
            {pack.licenceStages.graceDays} days. Expiry: Day {expiryDay}.
          </span>
        </div>
        {isUnverified && <UnverifiedMark label="Wording Unverified" />}
      </div>

      <DataTable
        caption="Licence Stages and Regulatory Consequences"
        columns={columns}
        data={rows}
        getRowKey={(r) => r.stage}
      />
    </div>
  );
};
