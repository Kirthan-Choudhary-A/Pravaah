import React, { useState } from 'react';
import { CadVehicleScene } from './CadVehicleScene';
import type { ViewMode } from './CadVehicleModel';
import styles from './CadVehicleViewer.module.css';

const MODES: readonly { readonly id: ViewMode; readonly label: string; readonly hint: string }[] = [
  { id: 'rendered', label: 'Rendered', hint: 'Lit paint, chrome and rubber' },
  { id: 'clay', label: 'Clay', hint: 'One matte material, to judge the form' },
  { id: 'wireframe', label: 'Wireframe', hint: 'Every triangle edge' },
  { id: 'blueprint', label: 'Blueprint', hint: 'Hidden-line technical drawing' },
];

export interface CadVehicleViewerProps {
  readonly zoomable?: boolean;
  readonly initialMode?: ViewMode;
  readonly className?: string;
}

/** The 3D model with a small viewport toolbar, like the view menu in a CAD or modelling package. */
export const CadVehicleViewer: React.FC<CadVehicleViewerProps> = ({
  zoomable = false,
  initialMode = 'rendered',
  className = '',
}) => {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [dimensions, setDimensions] = useState(true);
  const [spin, setSpin] = useState(true);
  const current = MODES.find((m) => m.id === mode);

  return (
    <div className={`${styles.viewer ?? ''} ${className}`.trim()}>
      <div className={styles.stage}>
        <CadVehicleScene mode={mode} dimensions={dimensions} autoRotate={spin} zoomable={zoomable} />
      </div>
      <div className={styles.bar} role="toolbar" aria-label="3D view options">
        <div className={styles.modes} role="group" aria-label="Display mode">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.btn ?? ''} ${mode === m.id ? (styles.btnOn ?? '') : ''}`}
              aria-pressed={mode === m.id}
              title={m.hint}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input type="checkbox" checked={dimensions} onChange={(e) => setDimensions(e.target.checked)} />
            Dimensions
          </label>
          <label className={styles.toggle}>
            <input type="checkbox" checked={spin} onChange={(e) => setSpin(e.target.checked)} />
            Turntable
          </label>
        </div>
      </div>
      <p className={styles.hint} aria-live="polite">
        {current?.hint}. Drag to turn the model.
      </p>
    </div>
  );
};

export default CadVehicleViewer;
