import React, {
  useState,
  useEffect,
  useRef,
  Suspense,
  type ReactNode,
} from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useDeviceCapabilities, type QualityTier } from '../hooks/useDeviceCapabilities';
import { QuietLoader } from './utils/QuietLoader';

export interface CanvasWrapperProps {
  readonly children: ReactNode;
  readonly fallback: ReactNode;
  readonly tier?: QualityTier;
  readonly camera?: {
    readonly position?: [number, number, number];
    readonly fov?: number;
    readonly near?: number;
    readonly far?: number;
  };
  readonly ariaLabel?: string;
  /** Soft shadow maps from the key light. */
  readonly shadows?: boolean;
  readonly style?: React.CSSProperties;
  readonly className?: string;
}

export const CanvasWrapper: React.FC<CanvasWrapperProps> = ({
  children,
  fallback,
  tier: propTier,
  camera = { position: [0, 0, 5], fov: 35, near: 0.1, far: 50 },
  ariaLabel = 'Interactive 3D visualization',
  shadows = false,
  style,
  className = '',
}) => {
  const detected = useDeviceCapabilities();
  const effectiveTier = propTier || detected.tier;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [contextLost, setContextLost] = useState(false);

  // IntersectionObserver to pause rendering when canvas is off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Show non-WebGL fallback if quality tier is fallback or context was lost
  if (effectiveTier === 'fallback' || contextLost || !detected.hasWebGL) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: 'relative', width: '100%', height: '100%', minHeight: '320px', ...style }}
        role="region"
        aria-label={ariaLabel}
      >
        {fallback}
      </div>
    );
  }

  // DPR configuration: [1, 1.75] for full, [1, 1.25] for lite
  const dpr: [number, number] = effectiveTier === 'full' ? [1, 2] : [1, 1.25];

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '320px',
        overflow: 'hidden',
        ...style,
      }}
      role="region"
      aria-label={ariaLabel}
    >
      <Suspense fallback={<QuietLoader />}>
        <Canvas
          shadows={shadows ? 'percentage' : false}
          // 'always' while visible: scenes animate with useFrame. 'demand' left them frozen or blank.
          frameloop={isIntersecting ? 'always' : 'never'}
          dpr={dpr}
          camera={{
            position: camera.position || [0, 0, 5],
            fov: camera.fov || 35,
            near: camera.near || 0.1,
            far: camera.far || 50,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          onCreated={({ gl }) => {
            // WebGL context loss handling
            const domElement = gl.domElement;
            const handleContextLost = (event: Event) => {
              event.preventDefault();
              setContextLost(true);
            };
            const handleContextRestored = () => {
              setContextLost(false);
            };

            domElement.addEventListener('webglcontextlost', handleContextLost, false);
            domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

            return () => {
              domElement.removeEventListener('webglcontextlost', handleContextLost);
              domElement.removeEventListener('webglcontextrestored', handleContextRestored);
              gl.dispose();
            };
          }}
        >
          {children}
        </Canvas>
      </Suspense>
    </div>
  );
};
