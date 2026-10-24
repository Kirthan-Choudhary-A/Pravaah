import React from 'react';
import styles from './Stack.module.css';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly direction?: 'row' | 'column';
  readonly gap?: '1' | '2' | '3' | '4' | '5' | '6' | '8';
  readonly align?: 'start' | 'center' | 'end' | 'stretch';
  readonly justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  readonly wrap?: boolean;
  readonly children: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({
  direction = 'column',
  gap = '4',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className = '',
  children,
  ...props
}) => {
  const stackClasses = [
    styles.stack,
    styles[direction],
    styles[`gap-${gap}`],
    styles[`align-${align}`],
    styles[`justify-${justify}`],
    wrap ? styles.wrap : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={stackClasses} {...props}>
      {children}
    </div>
  );
};
