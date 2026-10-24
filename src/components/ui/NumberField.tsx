import React, { useId } from 'react';
import styles from './NumberField.module.css';

export interface NumberFieldProps {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly unit?: string;
  readonly description?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  description,
  disabled = false,
  className = '',
}) => {
  const generatedId = useId();
  const inputId = `${generatedId}-number`;
  const descId = description ? `${generatedId}-desc` : undefined;

  return (
    <div className={`${styles.wrapper} ${className}`.trim()}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>

      <div className={styles.inputContainer}>
        <input
          id={inputId}
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number.isNaN(value) ? '' : value}
          disabled={disabled}
          aria-describedby={descId}
          className={styles.input}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!Number.isNaN(val)) {
              onChange(val);
            }
          }}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>

      {description && (
        <p id={descId} className={styles.description}>
          {description}
        </p>
      )}
    </div>
  );
};
