import React from 'react';
import { usePlan } from '@state/index';
import { Container } from '@components/layout/Container';
import { Stack } from '@components/layout/Stack';
import { Disclosure } from '@components/ui/Disclosure';
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
    status: 'Modelled; exact penalty rates not yet confirmed.',
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
      '30-day notice limit is modelled; online and offline rules not confirmed per state.',
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
      key: 'title',
      header: 'Law or website',
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
      header: 'Website',
      render: (s) => {
        // Link to the official site itself; the exact page is not confirmed yet.
        let site = s.url;
        let host = s.url;
        try {
          const u = new URL(s.url);
          site = u.origin;
          host = u.hostname;
        } catch {
          // keep the raw value
        }
        return (
          <a href={site} target="_blank" rel="noreferrer noopener" className={styles.sourceUrl}>
            {host}
          </a>
        );
      },
    },
    {
      key: 'verification',
      header: 'Status',
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
            title="Official sources"
            description="Where each rule and fee comes from. None has been checked against the official text yet, so confirm with your RTO before you act."
          />

          <section aria-labelledby="sources-heading" className={styles.sectionContainer}>
            <h2 id="sources-heading" className={styles.sectionTitle}>
              Laws and government websites ({sources.length})
            </h2>
            <DataTable
              caption="Official laws and government portals"
              columns={sourceColumns}
              data={sources}
              getRowKey={(s) => s.id}
            />
          </section>

          <section aria-label="More detail" className={styles.sectionContainer}>
            <Disclosure title="Rules not yet checked">
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
            </Disclosure>
            <Disclosure title="Rules by state">
              <DataTable
                caption="States with rules in Pravaah"
                columns={packColumns}
                data={REGISTERED_PACKS}
                getRowKey={(p) => p.code}
              />
            </Disclosure>
          </section>
        </Stack>
      </Container>
    </div>
  );
};
