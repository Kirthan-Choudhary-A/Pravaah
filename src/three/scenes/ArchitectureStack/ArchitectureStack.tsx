import React, { useState } from 'react';
import { CanvasWrapper } from '../../CanvasWrapper';
import { ArchitectureStackScene } from './ArchitectureStackScene';
import { ArchitectureStackFallback, type ArchitectureLayerInfo } from './ArchitectureStackFallback';
import { useDeviceCapabilities } from '../../../hooks/useDeviceCapabilities';
import styles from './ArchitectureStack.module.css';

const ARCHITECTURE_LAYERS: readonly ArchitectureLayerInfo[] = [
  {
    id: 'screens',
    name: 'Screens & Interaction',
    description:
      'Accessible, WCAG AA interfaces across Story (/), Planner (/plan), Simulator (/simulate), Household (/household), and Voice (/voice). All plans display simulated-data notices and word-based statuses.',
  },
  {
    id: 'state',
    name: 'App State & Privacy Reducer',
    description:
      'URL-synced state with consent management, browser-local delegation persistence (simulated), time-limited field reveals, and live-region announcements for screen readers.',
  },
  {
    id: 'engine',
    name: 'Pure Deterministic Engine',
    description:
      'Zero external dependencies. Topological sorting, forward and backward pass for Latest Safe Date (LSD) computation, link invalidation cascade, and phonetic plate parsing with auto-fixes.',
  },
  {
    id: 'data',
    name: 'Rule Data & Rule Packs',
    description:
      'Validated by Zod at load time. Layered rule packs combining Central Motor Vehicles Rules (CMVR) with state-level overrides (TS, KA, MH, TN, DL), listing the official sources to check. All entries are unverified.',
  },
];

export const ArchitectureStack: React.FC = () => {
  const { tier } = useDeviceCapabilities();
  const [selectedLayerId, setSelectedLayerId] = useState<string>('engine');

  const selectedLayer =
    ARCHITECTURE_LAYERS.find((l) => l.id === selectedLayerId) || ARCHITECTURE_LAYERS[0]!;

  return (
    <div className={styles.stackSectionContainer}>
      {/* 3D Scene / SVG Fallback Area */}
      <div className={styles.sceneArea}>
        <CanvasWrapper
          fallback={
            <ArchitectureStackFallback
              layers={ARCHITECTURE_LAYERS}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
            />
          }
          tier={tier}
          camera={{ position: [0, 0.4, 5.5], fov: 36 }}
          ariaLabel="3D visual architecture layer stack with security spine"
        >
          <ArchitectureStackScene
            layers={ARCHITECTURE_LAYERS}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            tier={tier}
          />
        </CanvasWrapper>
      </div>

      {/* Interactive Selection and Plain Language Explanation */}
      <div className={styles.contentArea}>
        <div className={styles.layerButtonGroup} role="tablist" aria-label="System architecture layers">
          {ARCHITECTURE_LAYERS.map((layer) => {
            const isSelected = selectedLayerId === layer.id;
            return (
              <button
                key={layer.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`${styles.layerSelectBtn} ${isSelected ? styles.layerSelectBtnActive : ''}`}
                onClick={() => setSelectedLayerId(layer.id)}
              >
                <span>{layer.name}</span>
                <span aria-hidden="true">{isSelected ? '●' : '○'}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Layer Plain-Language Description */}
        <div className={styles.descriptionCard} role="tabpanel">
          <div className={styles.descriptionTitle}>{selectedLayer.name}</div>
          <p className={styles.descriptionText}>{selectedLayer.description}</p>
        </div>
      </div>
    </div>
  );
};
