import React from 'react';
import styles from './Banner.module.css';

export interface BannerProps {
  readonly variant?: 'info' | 'warning' | 'error' | 'degraded';
  readonly title: string;
  readonly children?: React.ReactNode;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

const ICONS: Record<string, string> = {
  info: 'ℹ',
  warning: '▲',
  error: '■',
  degraded: '⚠️',
};

export const Banner: React.FC<BannerProps> = ({
  variant = 'info',
  title,
  children,
  action,
  className = '',
}) => {
  const bannerClass = [styles.banner, styles[variant], className].filter(Boolean).join(' ');

  return (
    <aside className={bannerClass} role="region" aria-label={title}>
      <div className={styles.iconCol} aria-hidden="true">
        {ICONS[variant]}
      </div>
      <div className={styles.body}>
        <h4 className={styles.title}>{title}</h4>
        {children && <div className={styles.description}>{children}</div>}
      </div>
      {action && <div className={styles.actionCol}>{action}</div>}
    </aside>
  );
};
