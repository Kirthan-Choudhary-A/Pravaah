import React, { useState, useMemo } from 'react';
import type { ScheduledTask, AbsenceWindow, TaskStatus } from '@engine/model/types';
import { StatusTag } from '@components/ui/StatusTag';
import { DataTable, type Column } from '@components/ui/DataTable';
import styles from './Timeline.module.css';

export interface TimelineProps {
  readonly tasks: readonly ScheduledTask[];
  readonly absence?: AbsenceWindow;
  readonly primarySlotQueue?: number;
  readonly selectedTaskId?: string | null;
  readonly onSelectTask: (taskId: string) => void;
  readonly className?: string;
}

const LANE_LABEL: Record<string, string> = {
  licence: 'Licence',
  vehicle: 'Vehicle',
  identity: 'Identity',
  household: 'Family vehicle',
};

const statusKey = (status: TaskStatus): string => {
  const s = status.toLowerCase();
  if (s.includes('safe')) return 'status_safe';
  if (s.includes('risk')) return 'status_risk';
  if (s.includes('missed')) return 'status_missed';
  return 'status_unknown';
};

/**
 * The plan as a pipeline: one row per step, in the order each starts. Bars are scaled to the
 * width of the page, so nothing is cut off and nothing needs side-scrolling.
 */
export const Timeline: React.FC<TimelineProps> = ({
  tasks,
  absence,
  primarySlotQueue,
  selectedTaskId,
  onSelectTask,
  className = '',
}) => {
  // Phones get the table: a pipeline chart is hard to read at that width.
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>(() =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 40rem)').matches
      ? 'table'
      : 'timeline'
  );

  const rows = useMemo(
    () => [...tasks].sort((a, b) => a.start - b.start || a.end - b.end || a.name.localeCompare(b.name)),
    [tasks]
  );

  // Scale to when the work actually happens. Far-off deadlines (a 12-month limit) would squash it.
  const maxDay = Math.max(30, ...tasks.map((t) => t.end), absence?.end ?? 0, primarySlotQueue ?? 0);
  const totalDays = Math.ceil((maxDay + 1) / 5) * 5;
  const step = totalDays > 60 ? 10 : 5;
  const ticks: number[] = [];
  for (let d = 0; d <= totalDays; d += step) ticks.push(d);

  const pct = (day: number) => `${(Math.min(Math.max(day, 0), totalDays) / totalDays) * 100}%`;
  const span = (from: number, to: number) =>
    `${((Math.min(to, totalDays) - Math.max(from, 0)) / totalDays) * 100}%`;

  const tableColumns: readonly Column<ScheduledTask>[] = [
    {
      key: 'name',
      header: 'Step',
      render: (t) => (
        <div>
          <span className={styles.tableTaskName}>{t.name}</span>
          <span className={styles.tableTaskId}>{LANE_LABEL[t.lane] ?? t.lane}</span>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Runs',
      render: (t) => (
        <span className={styles.monoCell}>
          Day {t.start} to {t.end}
        </span>
      ),
    },
    {
      key: 'lsd',
      header: 'Latest start',
      render: (t) => <span className={styles.monoCell}>Day {t.lsd}</span>,
    },
    {
      key: 'slack',
      header: 'Spare days',
      render: (t) => (
        <span className={t.slack < 0 ? styles.slackNeg : styles.slackPos}>
          {t.slack >= 0 ? `+${t.slack}` : `${t.slack}`}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusTag status={t.status} size="sm" />,
    },
  ];

  return (
    <div className={`${styles.wrapper ?? ''} ${className}`.trim()}>
      <div className={styles.toolbar}>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch ?? ''} ${styles.status_safe ?? ''}`} /> Safe
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch ?? ''} ${styles.status_risk ?? ''}`} /> At risk
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch ?? ''} ${styles.status_missed ?? ''}`} /> Missed
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendAbsenceBox} /> You are away
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendLsd} /> Latest start
          </span>
        </div>

        <div className={styles.viewToggleGroup}>
          <button
            type="button"
            className={`${styles.viewBtn ?? ''} ${viewMode === 'timeline' ? (styles.viewBtnActive ?? '') : ''}`}
            onClick={() => setViewMode('timeline')}
            aria-pressed={viewMode === 'timeline'}
          >
            Visual Timeline
          </button>
          <button
            type="button"
            className={`${styles.viewBtn ?? ''} ${viewMode === 'table' ? (styles.viewBtnActive ?? '') : ''}`}
            onClick={() => setViewMode('table')}
            aria-pressed={viewMode === 'table'}
          >
            View as Table
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable
          caption="Tasks Schedule & Deadlines"
          columns={tableColumns}
          data={rows}
          getRowKey={(t) => t.id}
          onRowClick={(t) => onSelectTask(t.id)}
        />
      ) : (
        <div className={styles.board} role="group" aria-label="Plan timeline, one row per step in the order it starts">
          <div className={styles.axis}>
            <div className={styles.axisLabel}>Step</div>
            <div className={styles.axisTrack} aria-hidden="true">
              {ticks.map((d) => (
                <span key={d} className={styles.tick} style={{ left: pct(d) }}>
                  {d === 0 ? 'Today' : d}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.body}>
            {/* Shared background: grid lines, the days you are away and the first appointment slot */}
            <div className={styles.underlay} aria-hidden="true">
              {ticks.map((d) => (
                <i key={d} className={styles.gridLine} style={{ left: pct(d) }} />
              ))}
              {absence && (
                <div
                  className={styles.absence}
                  style={{ left: pct(absence.start), width: span(absence.start, absence.end) }}
                  title={`You are away on days ${absence.start} to ${absence.end - 1}`}
                >
                  <span>Away</span>
                </div>
              )}
              {primarySlotQueue !== undefined && (
                <div className={styles.slotLine} style={{ left: pct(primarySlotQueue) }}>
                  <span>First slot, day {primarySlotQueue}</span>
                </div>
              )}
            </div>

            {rows.map((task) => {
              const selected = selectedTaskId === task.id;
              const barWidth = `max(${span(task.start, task.end)}, 0.9%)`;
              return (
                <div key={task.id} className={`${styles.row ?? ''} ${selected ? (styles.rowSelected ?? '') : ''}`}>
                  <button
                    type="button"
                    className={styles.rowLabel}
                    onClick={() => onSelectTask(task.id)}
                    aria-label={`${task.name}: ${task.status}, start day ${task.start}, end day ${task.end}, latest start day ${task.lsd}`}
                  >
                    <span className={styles.rowName}>{task.name}</span>
                    <span className={styles.rowMeta}>
                      <StatusTag status={task.status} size="sm" />
                      {LANE_LABEL[task.lane] ?? task.lane} · day {task.start} to {task.end}
                    </span>
                  </button>
                  <div className={styles.track}>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      className={`${styles.bar ?? ''} ${styles[statusKey(task.status)] ?? ''}`}
                      style={{ left: pct(task.start), width: barWidth }}
                      onClick={() => onSelectTask(task.id)}
                    />
                    {task.lsd >= 0 && task.lsd <= totalDays && (
                      <span
                        className={styles.lsd}
                        style={{ left: pct(task.lsd) }}
                        title={`Latest day this can start: day ${task.lsd}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
