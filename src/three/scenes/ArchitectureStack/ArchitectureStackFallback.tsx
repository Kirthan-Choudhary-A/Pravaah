import React from 'react';
import styles from './ArchitectureStack.module.css';

export interface ArchitectureLayerInfo {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface ArchitectureStackFallbackProps {
  readonly layers: readonly ArchitectureLayerInfo[];
  readonly selectedLayerId: string;
  readonly onSelectLayer: (id: string) => void;
}

export const ArchitectureStackFallback: React.FC<ArchitectureStackFallbackProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
}) => {
  return (
    <div className={styles.svgFallbackContainer} role="region" aria-label="Architecture layers diagram">
      <svg viewBox="0 0 460 280" className={styles.svgDiagram} role="img" aria-label="Diagram showing Data, Engine, State, and Screens layers with Security spine">
        {/* Security Spine */}
        <rect x="20" y="24" width="28" height="232" rx="4" fill="#777965" stroke="#343531" strokeWidth="1.5" />
        <text
          x="34"
          y="140"
          transform="rotate(-90 34 140)"
          textAnchor="middle"
          fill="#faf9f5"
          fontFamily="'IBM Plex Mono', monospace"
          fontSize="11"
          fontWeight="700"
          letterSpacing="2"
        >
          SECURITY &amp; PRIVACY
        </text>

        {/* 4 Layers Stack */}
        {layers.map((layer, idx) => {
          const y = 30 + idx * 56;
          const isSelected = selectedLayerId === layer.id;

          return (
            <g
              key={layer.id}
              onClick={() => onSelectLayer(layer.id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x="68"
                y={y}
                width="360"
                height="46"
                rx="3"
                fill={isSelected ? '#242522' : '#f3f0e8'}
                stroke={isSelected ? '#171815' : '#b7b0a3'}
                strokeWidth={isSelected ? '2' : '1'}
              />
              <text
                x="88"
                y={y + 28}
                fill={isSelected ? '#faf9f5' : '#242522'}
                fontFamily="'IBM Plex Sans', sans-serif"
                fontSize="14"
                fontWeight="700"
              >
                {layer.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
