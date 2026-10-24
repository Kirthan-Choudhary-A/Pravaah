import React from 'react';
import type { TaskStatus } from '@engine/model/types';
import styles from './Runway.module.css';

export interface RunwayProps {
  /** Licence expiry day. */
  readonly expiryDay: number;
  /** The licence renewal task's window and status. */
  readonly renewal: { readonly start: number; readonly end: number; readonly status: TaskStatus } | null;
  /** Owner-away window, half-open [start, end). */
  readonly absence: { readonly start: number; readonly end: number };
  /** Day of the first in-person appointment slot. */
  readonly firstSlotDay: number;
  /** Day the whole plan finishes. */
  readonly finishDay: number;
}

const STATUS_CLASS: Record<TaskStatus, string> = {
  Safe: 'safe',
  'At risk': 'risk',
  Missed: 'missed',
  Unknown: 'unknown',
};

/**
 * One line from today to the end of the plan: when the licence expires, when its renewal runs,
 * when the owner is away, and when the first slot is. Every mark is also written out in words.
 */
export const Runway: React.FC<RunwayProps> = ({
  expiryDay,
  renewal,
  absence,
  firstSlotDay,
  finishDay,
}) => {
  const span = Math.max(40, Math.ceil(Math.max(expiryDay, finishDay, absence.end, firstSlotDay) / 5) * 5);
  const pct = (day: number) => `${(Math.min(day, span) / span) * 100}%`;
  const width = (from: number, to: number) => `${((Math.min(to, span) - from) / span) * 100}%`;
  const ticks = Array.from({ length: span / 5 + 1 }, (_, i) => i * 5);
  const lapses = renewal !== null && renewal.end > expiryDay;

  return (
    <figure className={styles.runway}>
      <div className={styles.track}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Licence renewal</span>
          <div className={styles.lane}>
            {renewal && (
              <div
                className={`${styles.bar ?? ''} ${styles[STATUS_CLASS[renewal.status]] ?? ''}`}
                style={{ left: pct(renewal.start), width: width(renewal.start, renewal.end) }}
              >
                {renewal.status}
              </div>
            )}
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Owner away</span>
          <div className={styles.lane}>
            <div
              className={styles.away}
              style={{ left: pct(absence.start), width: width(absence.start, absence.end) }}
            >
              Away
            </div>
          </div>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>First slot</span>
          <div className={styles.lane}>
            <div className={styles.slot} style={{ left: pct(firstSlotDay) }}>
              Day {firstSlotDay}
            </div>
          </div>
        </div>

        <div className={styles.markers} aria-hidden="true">
          <div className={styles.expiry} style={{ left: pct(expiryDay) }}>
            <span className={styles.markerText}>Expires day {expiryDay}</span>
          </div>
          <div className={styles.finish} style={{ left: pct(finishDay) }}>
            <span className={styles.markerText}>Plan done day {finishDay}</span>
          </div>
        </div>

        <div className={styles.axis} aria-hidden="true">
          {ticks.map((d) => (
            <span key={d} className={styles.tick} style={{ left: pct(d) }}>
              {d}
            </span>
          ))}
        </div>
      </div>

      <figcaption className={styles.caption}>
        The licence expires on day {expiryDay}.
        {renewal ? ` Renewal finishes on day ${renewal.end} (${renewal.status}).` : ''}
        {lapses ? ' That is after expiry.' : ''} You are away on days {absence.start} to{' '}
        {absence.end - 1}. The first appointment is on day {firstSlotDay}.
      </figcaption>
    </figure>
  );
};
