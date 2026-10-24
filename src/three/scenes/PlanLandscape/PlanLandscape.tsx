import React, { useState } from 'react';
import type { ScheduledTask, Link, AbsenceWindow } from '../../../engine/model/types';
import { CanvasWrapper } from '../../CanvasWrapper';
import { PlanLandscapeScene } from './PlanLandscapeScene';
import { PlanLandscapeFallback } from './PlanLandscapeFallback';
import { useDeviceCapabilities } from '../../../hooks/useDeviceCapabilities';
import styles from './PlanLandscape.module.css';

export interface PlanLandscapeProps {
  readonly tasks: readonly ScheduledTask[];
  readonly links?: readonly Link[];
  readonly absence?: AbsenceWindow;
  readonly primarySlotQueue?: number;
  readonly finishDay?: number;
  readonly finishingTask?: string;
  readonly licenceStatus?: string;
  readonly diffCaption?: string | null;
  readonly selectedTaskId?: string | null;
  readonly onSelectTask?: (taskId: string) => void;
  readonly className?: string;
}

export const PlanLandscape: React.FC<PlanLandscapeProps> = ({
  tasks,
  links = [],
  absence,
  primarySlotQueue,
  finishDay = 31,
  finishingTask = 'Licence Address Change',
  licenceStatus = 'Safe',
  diffCaption,
  selectedTaskId,
  onSelectTask,
  className = '',
}) => {
  const { tier } = useDeviceCapabilities();
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleResetView = () => {
    setResetTrigger((prev) => prev + 1);
  };

  return (
    <div className={`${styles.landscapeContainer} ${className}`} role="region" aria-label="Interactive 3D timeline landscape view">
      {/* 3D Canvas */}
      <div className={styles.canvasContainer}>
        <CanvasWrapper
          fallback={<PlanLandscapeFallback tasks={tasks} />}
          tier={tier}
          camera={{ position: [20, 12, 16], fov: 38 }}
          ariaLabel="3D visual plan landscape"
        >
          <PlanLandscapeScene
            tasks={tasks}
            links={links}
            absence={absence}
            primarySlotQueue={primarySlotQueue}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            tier={tier}
            resetTrigger={resetTrigger}
          />
        </CanvasWrapper>
      </div>

      {/* Top Bar: Summary and Reset */}
      <div className={styles.topBar}>
        <div className={styles.summaryBadge}>
          <span>
            <strong>Plan Finish:</strong> Day {finishDay} ({finishingTask}) • <strong>DL:</strong> {licenceStatus}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--iron)' }}>
            (Full details also in 2D timeline &amp; graph)
          </span>
        </div>

        <button type="button" className={styles.resetBtn} onClick={handleResetView}>
          ↺ Reset View
        </button>
      </div>

      {/* Diff Notice Banner when an event changes plan */}
      {diffCaption && (
        <div className={styles.diffNotice} role="status">
          <strong>Plan updated:</strong> {diffCaption}
        </div>
      )}

      {/* 3D HTML Legend Bar at Bottom */}
      <div className={styles.legendBar} aria-label="3D timeline legend">
        <div className={styles.legendItems}>
          <span>
            <span className={styles.legendDot} style={{ backgroundColor: '#2e5328' }} />
            Safe
          </span>
          <span>
            <span className={styles.legendDot} style={{ backgroundColor: '#7a4b00' }} />
            At risk
          </span>
          <span>
            <span className={styles.legendDot} style={{ backgroundColor: '#962828' }} />
            Missed
          </span>
          <span>
            <span className={styles.legendDot} style={{ backgroundColor: '#52544e' }} />
            Unknown
          </span>
          <span>•</span>
          <span style={{ color: '#5a5c56' }}>— Needs</span>
          <span style={{ color: '#2e5328' }}>--- Unlocks</span>
          <span style={{ color: '#962828' }}>-·- Invalidates</span>
        </div>

        <div style={{ fontSize: '0.6875rem', color: 'var(--iron)' }}>
          Click or tap any task block to inspect details.
        </div>
      </div>
    </div>
  );
};
