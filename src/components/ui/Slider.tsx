import React, { useId } from 'react';
import styles from './Slider.module.css';

export interface SliderProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  readonly unit?: string;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  description,
  disabled = false,
  className = '',
}) => {
  const generatedId = useId();
  const inputId = `${generatedId}-slider`;
  const descId = description ? `${generatedId}-desc` : undefined;

  return (
    <div className={`${styles.wrapper} ${className}`.trim()}>
      <div className={styles.header}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        <span className={styles.valueDisplay}>
          {value}
          {unit && <span className={styles.unit}>{unit}</span>}
        </span>
      </div>

      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-describedby={descId}
        className={styles.input}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <div className={styles.rangeLabels} aria-hidden="true">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>

      {description && (
        <p id={descId} className={styles.description}>
          {description}
        </p>
      )}
    </div>
  );
};
