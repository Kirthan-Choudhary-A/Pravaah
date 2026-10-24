import React from 'react';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  readonly title: string;
  readonly description?: React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly id?: string;
}

/** The one header every page uses: flat, left-aligned, actions on the right. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, id }) => (
  <header className={styles.pageHeader}>
    <div className={styles.text}>
      <h1 id={id} className={styles.title}>
        {title}
      </h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
);
