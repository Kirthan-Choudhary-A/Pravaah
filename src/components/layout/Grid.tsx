import React from 'react';
import styles from './Grid.module.css';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly columns?: 1 | 2 | 3 | 4 | 'auto';
  readonly minItemWidth?: string;
  readonly gap?: '2' | '4' | '6' | '8';
  readonly children: React.ReactNode;
}

export const Grid: React.FC<GridProps> = ({
  columns = 'auto',
  minItemWidth = '280px',
  gap = '4',
  style,
  className = '',
  children,
  ...props
}) => {
  const dynamicStyle: React.CSSProperties = {
    ...style,
    ...(columns === 'auto'
      ? { gridTemplateColumns: `repeat(auto-fit, minmax(min(${minItemWidth}, 100%), 1fr))` }
      : {}),
  };

  const gridClass = [
    styles.grid,
    typeof columns === 'number' ? styles[`cols-${columns}`] : '',
    styles[`gap-${gap}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={gridClass} style={dynamicStyle} {...props}>
      {children}
    </div>
  );
};
