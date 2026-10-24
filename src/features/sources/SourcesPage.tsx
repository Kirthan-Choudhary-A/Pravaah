import React from 'react';
import { usePlan } from '@state/index';
import { Container } from '@components/layout/Container';
import { Stack } from '@components/layout/Stack';
import { Banner } from '@components/ui/Banner';
import { DataTable, type Column } from '@components/ui/DataTable';
import { UnverifiedMark } from '@components/ui/UnverifiedMark';
import type { SourceEntry } from '@engine/model/types';
import { PageHeader } from '@components/layout/PageHeader';
import styles from './SourcesPage.module.css';

interface RulePackMeta {
  readonly code: string;
  readonly name: string;
  readonly version: string;
  readonly type: 'Central' | 'State Override';
  readonly jurisdiction: string;
}

const REGISTERED_PACKS: readonly RulePackMeta[] = [
  {
    code: 'Central',
    name: 'Union of India (Central MV Act & CMVR)',
    version: 'v2026.1',
    type: 'Central',
    jurisdiction: 'All States & Union Territories (National Baseline)',
  },
  {
    code: 'TS',
    name: 'Telangana Transport Department',
    version: 'v2026.1',
    type: 'State Override',
    jurisdiction: 'Hyderabad RTOs (TS-09, etc.)',
  },
  {
    code: 'KA',
    name: 'Karnataka Transport Department',
    version: 'v2026.1',
    type: 'State Override',
    jurisdiction: 'Bengaluru RTOs (KA-01, KA-03, KA-05, etc.)',
  },
  {
    code: 'MH',
    name: 'Maharashtra Motor Vehicles Department',
    version: 'v2026.1',
    type: 'State Override',
    jurisdiction: 'Pune (MH-12), Mumbai, etc.',
  },
  {
    code: 'TN',
    name: 'Tamil Nadu Transport Department',
    version: 'v2026.1',
    type: 'State Override',
    jurisdiction: 'Chennai RTOs (TN-07, etc.)',
  },
  {
    code: 'DL',
    name: 'Delhi Transport Department (GNCTD)',
    version: 'v2026.1',
    type: 'State Override',
    jurisdiction: 'Delhi RTOs (DL-3S, etc.)',
  },
];

const UNVERIFIED_REGISTER = [
  {
    field: 'Licence Stages Grace & Late Fees',
    section: 'MV Act Section 14, 15 & CMVR Rule 32',
    status: 'Statutory basis modelled; exact gazette penalty rates pending confirmation.',
  },
  {
    field: 'Re-Registration 12-Month Limit',
    section: 'MV Act Section 47',
    status: '12-month period for inter-state stay modelled; local penalty schedules unverified.',
  },
  {
    field: 'RC Address Change Intimation (30 Days)',
    section: 'MV Act Section 49',
    status:
      'Statutory 30-day notice limit modelled; online vs offline parity unverified per state.',
  },
  {
    field: 'Inter-RTO Licence Renewal Jurisdiction',
    section: 'CMVR Rule 14 & Sarathi Workflow',
    status:
      'Ability of non-parent RTO to renew licence prior to address change is modelled as restricted.',
  },
  {
    field: 'Hypothecation Form 35 Blocking',
    section: 'CMVR Rule 61 & Operational SOP',
    status: 'Modelled rule: pending unilateral application blocks parent RTO NOC issuance.',
  },
];

export const SourcesPage: React.FC = () => {
  const { sources } = usePlan();

  const sourceColumns: readonly Column<SourceEntry>[] = [
    {
      key: 'id',
      header: 'Source ID',
      width: '140px',
      render: (s) => <span className={styles.monoCell}>{s.id}</span>,
    },
    {
      key: 'title',
      header: 'Document Title & Publisher',
      render: (s) => (
        <div>
          <span className={styles.sourceTitle}>{s.title}</span>
          <span className={styles.sourcePublisher}>{s.publisher}</span>
        </div>
      ),
    },
    {
      key: 'kind',
      header: 'Type',
      width: '120px',
      render: (s) => <span className={styles.kindTag}>{s.kind}</span>,
    },
    {
      key: 'url',
      header: 'Official Portal URL',
      render: (s) => (
        <a href={s.url} target="_blank" rel="noreferrer noopener" className={styles.sourceUrl}>
          {s.url} ↗
        </a>
      ),
    },
    {
      key: 'verification',
      header: 'Audit Status',
      width: '110px',
      render: (s) =>
        s.verified ? <span className={styles.verifiedTag}>Verified</span> : <UnverifiedMark />,
    },
  ];

  const packColumns: readonly Column<RulePackMeta>[] = [
    {
      key: 'code',
      header: 'Code',
      width: '80px',
      render: (p) => <span className={styles.packCode}>{p.code}</span>,
    },
    {
      key: 'name',
      header: 'Rule Pack Authority',
      render: (p) => <span className={styles.packName}>{p.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      width: '130px',
      render: (p) => <span className={styles.packType}>{p.type}</span>,
    },
    {
      key: 'jurisdiction',
      header: 'Jurisdiction',
      render: (p) => <span className={styles.packJurisdiction}>{p.jurisdiction}</span>,
    },
    {
      key: 'version',
      header: 'Version',
      width: '90px',
      render: (p) => <span className={styles.monoCell}>{p.version}</span>,
    },
  ];

  return (
    <div className={styles.page}>
      <Container size="xl">
        <Stack gap="6">
          <PageHeader
            title="Official Legal Sources & Rule Packs"
            description="Pravaah models its rules on the Motor Vehicles Act 1988, the Central Motor Vehicles Rules 1989 and Parivahan Sewa guidelines. Every rule stays marked unverified until the official source has been read."
            actions={<span className={styles.simulatedPill}>SIMULATED</span>}
          />

          {/* Degraded Mode Architectural Notice */}
          <Banner variant="info" title="Degraded Mode & Unknown Jurisdiction Architecture">
            <p>
              When a citizen moves to or operates in a state with no custom rule pack (such as
              Sikkim &apos;SK&apos; in Scenario C), Pravaah runs in <strong>Degraded Mode</strong>:
            </p>
            <ul className={styles.principlesList}>
              <li>
                <strong>No Hallucinated Rules:</strong> The system never invents local fees, local
                road tax, or fictitious state portal requirements.
              </li>
              <li>
                <strong>Clear Warnings:</strong> Items requiring local verification display
                &ldquo;Rules unknown – confirm with the RTO&rdquo; and link directly to official
                portals.
              </li>
              <li>
                <strong>Safe Fallbacks:</strong> Central rules in the registry (e.g. Section 15
                renewal and Section 47 re-registration limits) remain in use, still marked
                unverified.
              </li>
            </ul>
          </Banner>

          {/* Layered Rule Packs Registry */}
          <section aria-labelledby="rulepacks-heading" className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <h2 id="rulepacks-heading" className={styles.sectionTitle}>
                Layered Rule Packs (Central + State Overrides)
              </h2>
              <span className={styles.sectionMeta}>
                Versioned rule packs layered on top of Union of India Central rules
              </span>
            </div>
            <DataTable
              caption="Registered State & Central Rule Packs"
              columns={packColumns}
              data={REGISTERED_PACKS}
              getRowKey={(p) => p.code}
            />
          </section>

          {/* Official Sources Registry */}
          <section aria-labelledby="sources-heading" className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <h2 id="sources-heading" className={styles.sectionTitle}>
                Official Source Registry ({sources.length} Documents)
              </h2>
              <span className={styles.sectionMeta}>
                Restricted to whitelisted official domains: indiacode.nic.in, morth.nic.in,
                parivahan.gov.in, and official state transport portals.
              </span>
            </div>
            <DataTable
              caption="Official Statutory Citations and Government Portals"
              columns={sourceColumns}
              data={sources}
              getRowKey={(s) => s.id}
            />
          </section>

          {/* Unverified Items Register */}
          <section aria-labelledby="unverified-heading" className={styles.sectionContainer}>
            <div className={styles.sectionHeader}>
              <h2 id="unverified-heading" className={styles.sectionTitle}>
                Unverified Items & Audit Register
              </h2>
              <span className={styles.sectionMeta}>
                Modelled legal logic undergoing verification against latest official gazette
                notifications
              </span>
            </div>

            <div className={styles.unverifiedGrid}>
              {UNVERIFIED_REGISTER.map((item, idx) => (
                <div key={idx} className={styles.unverifiedCard}>
                  <div className={styles.cardTop}>
                    <h4 className={styles.fieldTitle}>{item.field}</h4>
                    <UnverifiedMark />
                  </div>
                  <span className={styles.statutoryCitation}>{item.section}</span>
                  <p className={styles.auditStatus}>{item.status}</p>
                </div>
              ))}
            </div>
          </section>
        </Stack>
      </Container>
    </div>
  );
};
