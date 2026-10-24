import React from 'react';
import type { TaskStatus } from '@engine/model/types';
import styles from './StatusTag.module.css';

export interface StatusTagProps {
  readonly status: TaskStatus | 'safe' | 'risk' | 'at-risk' | 'missed' | 'unknown' | string;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

interface StatusConfig {
  readonly label: string;
  readonly symbol: string;
  readonly styleKey: 'safe' | 'risk' | 'missed' | 'unknown';
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  safe: {
    label: 'Safe',
    symbol: '●',
    styleKey: 'safe',
  },
  risk: {
    label: 'At risk',
    symbol: '▲',
    styleKey: 'risk',
  },
  'at-risk': {
    label: 'At risk',
    symbol: '▲',
    styleKey: 'risk',
  },
  missed: {
    label: 'Missed',
    symbol: '■',
    styleKey: 'missed',
  },
  unknown: {
    label: 'Unknown',
    symbol: '○',
    styleKey: 'unknown',
  },
};

export const StatusTag: React.FC<StatusTagProps> = ({ status, size = 'md', className = '' }) => {
  const normalizedKey = status.toLowerCase().replace(/\s+/g, '-');
  const config = STATUS_CONFIGS[normalizedKey] || {
    label: status,
    symbol: '○',
    styleKey: 'unknown',
  };

  const tagClass = [styles.tag ?? '', styles[config.styleKey] ?? '', styles[size] ?? '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={tagClass} role="status">
      <span className={styles.symbol ?? ''} aria-hidden="true">
        {config.symbol}
      </span>
      <span className={styles.label ?? ''}>{config.label}</span>
    </span>
  );
};
