import React, { useState, useMemo } from 'react';
import type { ScheduledTask, TaskLane, AbsenceWindow, TaskStatus } from '@engine/model/types';
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

export const Timeline: React.FC<TimelineProps> = ({
  tasks,
  absence,
  primarySlotQueue,
  selectedTaskId,
  onSelectTask,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  const lanes = useMemo(() => {
    const hasHousehold = tasks.some((t) => t.lane === 'household');
    const list: { key: TaskLane; label: string }[] = [
      { key: 'licence', label: 'Licence Lane' },
      { key: 'vehicle', label: 'Vehicle Lane' },
      { key: 'identity', label: 'Identity Lane' },
    ];
    if (hasHousehold) {
      list.push({ key: 'household', label: 'Household (Family)' });
    }
    return list;
  }, [tasks]);

  // Compute horizontal axis range
  const maxTaskDay =
    tasks.length > 0 ? Math.max(...tasks.map((t) => Math.max(t.end, t.deadline ?? 0, t.lsd))) : 40;

  const maxDay = Math.max(50, maxTaskDay, absence?.end ?? 0, primarySlotQueue ?? 0);

  // Buffer range slightly
  const totalDays = Math.ceil(maxDay / 10) * 10 + 5;
  const dayStep = totalDays > 60 ? 10 : 5;
  const dayTicks: number[] = [];
  for (let d = 0; d <= totalDays; d += dayStep) {
    dayTicks.push(d);
  }

  // Pixel scaling: each day is 24px
  const dayWidth = 24;
  const chartWidth = totalDays * dayWidth;

  const getStatusSymbol = (status: TaskStatus) => {
    const s = status.toLowerCase();
    if (s.includes('safe')) return '●';
    if (s.includes('risk')) return '▲';
    if (s.includes('missed')) return '■';
    return '○';
  };

  const getStatusStyleKey = (status: TaskStatus) => {
    const s = status.toLowerCase();
    if (s.includes('safe')) return 'status_safe';
    if (s.includes('risk')) return 'status_risk';
    if (s.includes('missed')) return 'status_missed';
    return 'status_unknown';
  };

  // Table columns for alternate table view
  const tableColumns: readonly Column<ScheduledTask>[] = [
    {
      key: 'name',
      header: 'Task Name',
      render: (t) => (
        <div>
          <span className={styles.tableTaskName}>{t.name}</span>
          <span className={styles.tableTaskId}>{t.id}</span>
        </div>
      ),
    },
    {
      key: 'lane',
      header: 'Lane',
      render: (t) => <span className={styles.lanePill}>{t.lane}</span>,
    },
    {
      key: 'schedule',
      header: 'Window',
      render: (t) => (
        <span className={styles.monoCell}>
          Day {t.start} → {t.end} ({t.duration}d)
        </span>
      ),
    },
    {
      key: 'lsd',
      header: 'LSD',
      render: (t) => <span className={styles.monoCell}>Day {t.lsd}</span>,
    },
    {
      key: 'deadline',
      header: 'Deadline',
      render: (t) => (
        <span className={styles.monoCell}>
          {t.deadline !== undefined ? `Day ${t.deadline}` : '—'}
        </span>
      ),
    },
    {
      key: 'slack',
      header: 'Slack',
      render: (t) => (
        <span className={t.slack < 0 ? styles.slackNeg : styles.slackPos}>
          {t.slack >= 0 ? `+${t.slack}d` : `${t.slack}d`}
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
          <span className={styles.legendTitle}>Timeline:</span>
          <span className={styles.legendItem}>
            <span className={styles.legendSafeSymbol}>●</span> Safe
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendRiskSymbol}>▲</span> At risk
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendMissedSymbol}>■</span> Missed
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendAbsenceBox} /> Absence
          </span>
        </div>

        <div className={styles.viewToggleGroup}>
          <button
            type="button"
            className={`${styles.viewBtn ?? ''} ${
              viewMode === 'timeline' ? (styles.viewBtnActive ?? '') : ''
            }`}
            onClick={() => setViewMode('timeline')}
            aria-pressed={viewMode === 'timeline'}
          >
            Visual Timeline
          </button>
          <button
            type="button"
            className={`${styles.viewBtn ?? ''} ${
              viewMode === 'table' ? (styles.viewBtnActive ?? '') : ''
            }`}
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
          data={tasks}
          getRowKey={(t) => t.id}
          onRowClick={(t) => onSelectTask(t.id)}
        />
      ) : (
        <div
          className={styles.scrollContainer}
          role="region"
          aria-label="Interactive visual timeline (scroll horizontally for subsequent days)"
        >
          <div className={styles.gridBoard} style={{ width: `${chartWidth + 140}px` }}>
            {/* Header: Days Axis */}
            <div className={styles.axisRow}>
              <div className={styles.laneLabelCorner}>Lane</div>
              <div className={styles.axisTrack} style={{ width: `${chartWidth}px` }}>
                {dayTicks.map((d) => (
                  <div
                    key={d}
                    className={`${styles.axisTick ?? ''} ${
                      d === 0 ? (styles.axisTickToday ?? '') : ''
                    }`}
                    style={{ left: `${d * dayWidth}px` }}
                  >
                    <span className={styles.tickLabel}>{d === 0 ? 'Today (0)' : `D${d}`}</span>
                    <div className={styles.tickLine} />
                  </div>
                ))}
              </div>
            </div>

            {/* Lane Rows */}
            {lanes.map((lane) => {
              const laneTasks = tasks.filter((t) => t.lane === lane.key);

              return (
                <div key={lane.key} className={styles.laneRow}>
                  <div className={styles.laneHeader}>
                    <span className={styles.laneName}>{lane.label}</span>
                    <span className={styles.laneTaskCount}>{laneTasks.length} tasks</span>
                  </div>

                  <div className={styles.laneTrack} style={{ width: `${chartWidth}px` }}>
                    {/* Absence Overlay */}
                    {absence && (
                      <div
                        className={styles.absenceOverlay}
                        style={{
                          left: `${absence.start * dayWidth}px`,
                          width: `${(absence.end - absence.start) * dayWidth}px`,
                        }}
                        title={`Absence window: Day ${absence.start} to Day ${absence.end}`}
                      >
                        <span className={styles.absenceTag}>Absence</span>
                      </div>
                    )}

                    {/* Slot Queue Line if in licence lane */}
                    {lane.key === 'licence' && primarySlotQueue !== undefined && (
                      <div
                        className={styles.slotQueueLine}
                        style={{ left: `${primarySlotQueue * dayWidth}px` }}
                        title={`Earliest available slot: Day ${primarySlotQueue}`}
                      >
                        <span className={styles.slotQueueTag}>Slot Day {primarySlotQueue}</span>
                      </div>
                    )}

                    {/* Task Bars */}
                    {laneTasks.map((task) => {
                      const isSelected = selectedTaskId === task.id;
                      const leftPx = task.start * dayWidth;
                      const widthPx = Math.max(task.duration * dayWidth, 28);
                      const lsdOffsetPx = (task.lsd - task.start) * dayWidth;
                      const statusStyle = styles[getStatusStyleKey(task.status)] ?? '';

                      return (
                        <button
                          key={task.id}
                          type="button"
                          className={`${styles.taskBar ?? ''} ${statusStyle} ${
                            isSelected ? (styles.taskBarSelected ?? '') : ''
                          }`}
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                          }}
                          onClick={() => onSelectTask(task.id)}
                          aria-label={`${task.name}: ${task.status}, Start Day ${task.start}, End Day ${task.end}, LSD Day ${task.lsd}, Deadline Day ${task.deadline ?? 'none'}`}
                        >
                          <span className={styles.taskBarSymbol} aria-hidden="true">
                            {getStatusSymbol(task.status)}
                          </span>
                          <span className={styles.taskBarName}>{task.name}</span>

                          {/* LSD Tick */}
                          <div
                            className={styles.lsdTick}
                            style={{ left: `${Math.max(0, Math.min(lsdOffsetPx, widthPx - 2))}px` }}
                            title={`Latest Safe Date (LSD): Day ${task.lsd}`}
                          />
                        </button>
                      );
                    })}
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
