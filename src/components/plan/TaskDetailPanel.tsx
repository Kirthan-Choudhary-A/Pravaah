import React, { useMemo } from 'react';
import type { PlanResult, SourceEntry } from '@engine/model/types';
import { taskRelations, type TaskRelations } from '@engine/graph/links';
import { Panel } from '@components/ui/Panel';
import { StatusTag } from '@components/ui/StatusTag';
import { BasisTag } from '@components/ui/BasisTag';
import { UnverifiedMark } from '@components/ui/UnverifiedMark';
import styles from './TaskDetailPanel.module.css';

type RelationKey = Exclude<keyof TaskRelations, 'taskId' | 'taskName'>;

const RELATION_GROUPS: readonly {
  readonly key: RelationKey;
  readonly heading: string;
  readonly label: string;
  readonly warn?: boolean;
}[] = [
  { key: 'needs', heading: 'Needs first', label: '◀── [needs]' },
  { key: 'unlockedBy', heading: 'Unlocked by', label: '◀── [unlocks]' },
  { key: 'reuses', heading: 'Reuses documents from', label: '◀── [reuses]' },
  { key: 'propagatesFrom', heading: 'Receives data from', label: '◀── [propagates]' },
  { key: 'neededBy', heading: 'Needed by', label: '[needs] ──▶' },
  { key: 'unlocks', heading: 'Unlocks', label: '[unlocks] ──▶' },
  { key: 'reusedBy', heading: 'Documents reused by', label: '[reuses] ──▶' },
  { key: 'propagatesTo', heading: 'Passes data to', label: '[propagates] ──▶' },
  { key: 'invalidatedBy', heading: 'At risk from', label: '◀── ✕ [invalidates]', warn: true },
  {
    key: 'invalidates',
    heading: 'Invalidates if done too early',
    label: '✕ [invalidates] ──▶',
    warn: true,
  },
];

export interface TaskDetailPanelProps {
  readonly plan: PlanResult;
  readonly selectedTaskId: string | null;
  readonly onClose: () => void;
  readonly onSelectTask: (taskId: string) => void;
  readonly sources?: readonly SourceEntry[];
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  plan,
  selectedTaskId,
  onClose,
  onSelectTask,
  sources = [],
}) => {
  const task = useMemo(
    () => (selectedTaskId ? plan.tasks.find((t) => t.id === selectedTaskId) : null),
    [plan, selectedTaskId]
  );

  const relations = useMemo(() => {
    if (!task) return null;
    try {
      return taskRelations(plan, task.id);
    } catch {
      return null;
    }
  }, [plan, task]);

  const sourceMap = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);

  if (!task) return null;

  return (
    <Panel
      isOpen={Boolean(task)}
      onClose={onClose}
      title={
        <div className={styles.panelTitleContainer}>
          <span className={styles.laneBadge}>{task.lane}</span>
          <h3 className={styles.taskTitle}>{task.name}</h3>
        </div>
      }
    >
      <div className={styles.container}>
        {/* Status and IDs */}
        <div className={styles.metaRow}>
          <StatusTag status={task.status} />
          <span className={styles.taskId}>{task.id}</span>
        </div>

        {/* Schedule & Slack Metrics */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Scheduled</span>
            <span className={styles.metricValue}>
              Day {task.start} → {task.end}
            </span>
            <span className={styles.metricSub}>({task.duration} days)</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Latest Safe Date</span>
            <span className={styles.metricValue}>Day {task.lsd}</span>
            <span className={styles.metricSub}>LSD</span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Deadline</span>
            <span className={styles.metricValue}>
              {task.deadline !== undefined ? `Day ${task.deadline}` : 'None'}
            </span>
            <span className={styles.metricSub}>
              {task.deadline !== undefined ? 'Strict limit' : 'Derived from chain'}
            </span>
          </div>

          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Slack</span>
            <span
              className={`${styles.metricValue ?? ''} ${
                task.slack < 0 ? (styles.slackNeg ?? '') : (styles.slackPos ?? '')
              }`}
            >
              {task.slack >= 0 ? `+${task.slack}d` : `${task.slack}d`}
            </span>
            <span className={styles.metricSub}>
              {task.slack < 0 ? 'Critical overdue' : 'Buffer days'}
            </span>
          </div>
        </div>

        {/* Legal & Operational Justification */}
        <div className={styles.section}>
          <h4 className={styles.sectionHeading}>Why this task exists</h4>
          <p className={styles.whyText}>{task.why}</p>
          <div className={styles.basisGroup}>
            <span className={styles.basisGroupLabel}>Legal / Operational Basis:</span>
            <BasisTag basis={task.basis} />
            {task.uncertain && (
              <span className={styles.assumedTimingTag}>assumed timing ({task.duration}d)</span>
            )}
            {task.inPerson && <span className={styles.inPersonTag}>In-person RTO visit</span>}
          </div>
        </div>

        {/* Dependencies, both directions, every link type */}
        {relations &&
          RELATION_GROUPS.map((g) => {
            const items = relations[g.key];
            if (items.length === 0) return null;
            return (
              <div key={g.key} className={styles.section}>
                <h4
                  className={`${styles.sectionHeading ?? ''} ${
                    g.warn ? (styles.warningHeading ?? '') : ''
                  }`.trim()}
                >
                  {g.heading} ({items.length})
                </h4>
                <ul className={styles.relationsList}>
                  {items.map((item) => (
                    <li
                      key={`${g.key}-${item.id}`}
                      className={`${styles.relationItem ?? ''} ${
                        g.warn ? (styles.itemInvalidates ?? '') : ''
                      }`.trim()}
                    >
                      <div className={styles.relationTypeLabel}>{g.label}</div>
                      <button
                        type="button"
                        className={styles.relationTargetBtn}
                        onClick={() => onSelectTask(item.id)}
                      >
                        {item.name}
                      </button>
                      <p className={styles.relationReason}>{item.reason}</p>
                      {item.warning && (
                        <p className={styles.relationWarning} role="note">
                          ⚠ {item.warning}
                        </p>
                      )}
                      <div className={styles.basisGroup}>
                        <BasisTag basis={item.basis} />
                        {!item.verified && <UnverifiedMark />}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

        {/* Cited Legal Sources */}
        {task.sourceIds && task.sourceIds.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionHeading}>Official Sources Cited</h4>
            <ul className={styles.sourcesList}>
              {task.sourceIds.map((sid) => {
                const source = sourceMap.get(sid);
                return (
                  <li key={sid} className={styles.sourceItem}>
                    <div className={styles.sourceHeader}>
                      <span className={styles.sourcePublisher}>
                        {source?.publisher ?? 'Official Portal'}
                      </span>
                      {source && !source.verified && <UnverifiedMark />}
                    </div>
                    <span className={styles.sourceTitle}>{source?.title ?? sid}</span>
                    {source?.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={styles.sourceLink}
                      >
                        {source.url} ↗
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
};
