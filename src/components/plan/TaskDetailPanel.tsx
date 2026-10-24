import React, { useMemo } from 'react';
import type { PlanResult, SourceEntry } from '@engine/model/types';
import { taskRelations } from '@engine/graph/links';
import { Panel } from '@components/ui/Panel';
import { StatusTag } from '@components/ui/StatusTag';
import { BasisTag } from '@components/ui/BasisTag';
import { UnverifiedMark } from '@components/ui/UnverifiedMark';
import styles from './TaskDetailPanel.module.css';

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

        {/* Upstream Pre-requisites */}
        {relations && relations.needs.length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionHeading}>Pre-requisites ({relations.needs.length})</h4>
            <ul className={styles.relationsList}>
              {relations.needs.map((item) => (
                <li key={item.id} className={styles.relationItem}>
                  <button
                    type="button"
                    className={styles.relationTargetBtn}
                    onClick={() => onSelectTask(item.id)}
                  >
                    {item.name}
                  </button>
                  <p className={styles.relationReason}>{item.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Downstream Unlocks & Reuses */}
        {relations && (relations.unlocks.length > 0 || relations.reuses.length > 0) && (
          <div className={styles.section}>
            <h4 className={styles.sectionHeading}>Unlocks & Reuses</h4>
            <ul className={styles.relationsList}>
              {relations.unlocks.map((item) => (
                <li key={item.id} className={styles.relationItem}>
                  <div className={styles.relationTypeLabel}>── [unlocks] ──▶</div>
                  <button
                    type="button"
                    className={styles.relationTargetBtn}
                    onClick={() => onSelectTask(item.id)}
                  >
                    {item.name}
                  </button>
                  <p className={styles.relationReason}>{item.reason}</p>
                </li>
              ))}
              {relations.reuses.map((item) => (
                <li key={item.id} className={styles.relationItem}>
                  <div className={styles.relationTypeLabel}>── [reuses] ──▶</div>
                  <button
                    type="button"
                    className={styles.relationTargetBtn}
                    onClick={() => onSelectTask(item.id)}
                  >
                    {item.name}
                  </button>
                  <p className={styles.relationReason}>{item.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Downstream Invalidation & Propagation Warnings */}
        {relations && (relations.invalidates.length > 0 || relations.propagatesTo.length > 0) && (
          <div className={styles.section}>
            <h4 className={`${styles.sectionHeading ?? ''} ${styles.warningHeading ?? ''}`}>
              Consequences & Invalidation
            </h4>
            <ul className={styles.relationsList}>
              {relations.invalidates.map((item) => (
                <li
                  key={item.id}
                  className={`${styles.relationItem ?? ''} ${styles.itemInvalidates ?? ''}`}
                >
                  <div className={styles.invalidatesBadge}>✕ Invalidates</div>
                  <button
                    type="button"
                    className={styles.relationTargetBtn}
                    onClick={() => onSelectTask(item.id)}
                  >
                    {item.name}
                  </button>
                  <p className={styles.relationReason}>{item.reason}</p>
                </li>
              ))}
              {relations.propagatesTo.map((item) => (
                <li key={item.id} className={styles.relationItem}>
                  <div className={styles.relationTypeLabel}>── [propagates to] ──▶</div>
                  <button
                    type="button"
                    className={styles.relationTargetBtn}
                    onClick={() => onSelectTask(item.id)}
                  >
                    {item.name}
                  </button>
                  <p className={styles.relationReason}>{item.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

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
