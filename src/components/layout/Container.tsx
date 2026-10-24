import React from 'react';
import styles from './Container.module.css';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  readonly children: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({
  size = 'xl',
  className = '',
  children,
  ...props
}) => {
  const containerClass = `${styles.container} ${styles[size]} ${className}`.trim();
  return (
    <div className={containerClass} {...props}>
      {children}
    </div>
  );
};
