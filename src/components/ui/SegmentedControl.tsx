import React, { useRef, useId } from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentedControlOption<T extends string = string> {
  readonly value: T;
  readonly label: React.ReactNode;
  readonly badge?: React.ReactNode;
  readonly disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  readonly name?: string;
  readonly label?: string;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly options: readonly SegmentedControlOption<T>[];
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

export function SegmentedControl<T extends string = string>({
  label,
  value,
  onChange,
  options,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>): React.ReactElement {
  const generatedId = useId();
  const labelId = label ? `${generatedId}-label` : undefined;
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const enabledOptions = options.map((opt, idx) => ({ opt, idx })).filter((x) => !x.opt.disabled);
    const currentEnabledIdx = enabledOptions.findIndex((x) => x.idx === currentIndex);

    if (currentEnabledIdx === -1) return;

    let targetEnabledIdx: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetEnabledIdx = (currentEnabledIdx + 1) % enabledOptions.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetEnabledIdx = (currentEnabledIdx - 1 + enabledOptions.length) % enabledOptions.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetEnabledIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      targetEnabledIdx = enabledOptions.length - 1;
    }

    if (targetEnabledIdx !== null) {
      const target = enabledOptions[targetEnabledIdx];
      if (target) {
        onChange(target.opt.value);
        buttonRefs.current[target.idx]?.focus();
      }
    }
  };

  return (
    <div className={`${styles.wrapper} ${className}`.trim()}>
      {label && (
        <span id={labelId} className={styles.groupLabel}>
          {label}
        </span>
      )}
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-label={label ? undefined : 'Options'}
        className={`${styles.container} ${styles[size]}`}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={option.disabled}
              className={`${styles.option} ${isSelected ? styles.selected : ''}`}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <span className={styles.optionLabel}>{option.label}</span>
              {option.badge && <span className={styles.badge}>{option.badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
