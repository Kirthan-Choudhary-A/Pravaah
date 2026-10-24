import React from 'react';
import type { ScheduledTask } from '../../../engine/model/types';
import styles from './PlanLandscape.module.css';

export interface PlanLandscapeFallbackProps {
  readonly tasks: readonly ScheduledTask[];
}

export const PlanLandscapeFallback: React.FC<PlanLandscapeFallbackProps> = ({ tasks }) => {
  return (
    <div className={styles.fallbackNoticeBox} role="note">
      <div className={styles.fallbackTitle}>3D Landscape Fallback</div>
      <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--charcoal)' }}>
        Your device or browser is using the high-contrast 2D view. Full statutory schedules,
        dependencies, and Latest Safe Dates are available in the 2D visual timeline above.
      </p>
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--iron)', marginTop: '4px' }}>
        Total active plan tasks scheduled: <strong>{tasks.length}</strong>
      </div>
    </div>
  );
};
