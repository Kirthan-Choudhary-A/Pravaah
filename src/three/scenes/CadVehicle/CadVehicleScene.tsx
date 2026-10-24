import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer, ContactShadows, OrbitControls, Line, Grid } from '@react-three/drei';
import { CanvasWrapper } from '../../CanvasWrapper';
import { useDeviceCapabilities } from '../../../hooks/useDeviceCapabilities';
import { CadVehicleModel, buildBike, type ViewMode } from './CadVehicleModel';
import { CadVehicleFallback } from './CadVehicleFallback';

export interface CadVehicleSceneProps {
  readonly mode?: ViewMode;
  readonly autoRotate?: boolean;
  /** Let the visitor drag to turn the model. */
  readonly interactive?: boolean;
  /** Allow wheel / pinch zoom (leave off where the page must keep scrolling). */
  readonly zoomable?: boolean;
  /** Draw the length / height / wheelbase dimension lines. */
  readonly dimensions?: boolean;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

const GOLD = '#e2c27d';
const BG = '#0b1220';

/** A text label drawn to a canvas texture: no DOM overlay and no network font fetch. */
const Label: React.FC<{ readonly text: string; readonly position: [number, number, number] }> = ({
  text,
  position,
}) => {
  const { texture, aspect } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = 256;
    const h = 72;
    canvas.width = w;
    canvas.height = h;
    if (ctx) {
      ctx.fillStyle = 'rgba(11,18,32,0.85)';
      ctx.strokeStyle = 'rgba(226,194,125,0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(4, 4, w - 8, h - 8, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = GOLD;
      ctx.font = '600 34px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + 2);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return { texture: t, aspect: w / h };
  }, [text]);
  return (
    <sprite position={position} scale={[0.15 * aspect, 0.15, 1]} renderOrder={10}>
      <spriteMaterial map={texture} depthTest={false} transparent toneMapped={false} />
    </sprite>
  );
};

const Dimension: React.FC<{
  readonly from: [number, number, number];
  readonly to: [number, number, number];
  readonly label: string;
}> = ({ from, to, label }) => {
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  // Extension ticks at both ends, like a drawing.
  const tick = 0.04;
  const horizontal = Math.abs(to[0] - from[0]) > Math.abs(to[1] - from[1]);
  const t = (p: [number, number, number]): [[number, number, number], [number, number, number]] =>
    horizontal ? [[p[0], p[1] - tick, p[2]], [p[0], p[1] + tick, p[2]]] : [[p[0] - tick, p[1], p[2]], [p[0] + tick, p[1], p[2]]];
  return (
    <group>
      <Line points={[from, to]} color={GOLD} lineWidth={1.2} transparent opacity={0.9} />
      <Line points={t(from)} color={GOLD} lineWidth={1.2} />
      <Line points={t(to)} color={GOLD} lineWidth={1.2} />
      <Label text={label} position={mid} />
    </group>
  );
};

/** A premium CAD-style two-wheeler in a dark studio, with four viewport modes. */
export const CadVehicleScene: React.FC<CadVehicleSceneProps> = ({
  mode = 'rendered',
  autoRotate = true,
  interactive = true,
  zoomable = false,
  dimensions = true,
  ariaLabel = 'Interactive 3D model of a two-wheeler. Drag to turn it.',
  className,
  style,
}) => {
  const { prefersReducedMotion } = useDeviceCapabilities();
  const rotate = autoRotate && !prefersReducedMotion;
  const b = useMemo(() => buildBike().bounds, []);
  const halfL = b.length / 2;

  return (
    <CanvasWrapper
      className={className ?? ''}
      {...(style ? { style } : {})}
      ariaLabel={ariaLabel}
      shadows
      camera={{ position: [2.3, 1.05, 2.9], fov: 27, near: 0.1, far: 60 }}
      fallback={<CadVehicleFallback />}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 8, 18]} />

      {/* Studio reflections built in code: soft boxes, no network fetch. */}
      <Environment resolution={512} frames={1}>
        <Lightformer form="rect" intensity={2.6} position={[0, 5, 2]} scale={[9, 3, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={2} position={[-5, 2, 0]} scale={[5, 3, 1]} rotation-y={Math.PI / 2} color="#ffe2a8" />
        <Lightformer form="rect" intensity={1.8} position={[5, 1.5, -2]} scale={[5, 2.5, 1]} rotation-y={-Math.PI / 2} color="#a9c4ff" />
        <Lightformer form="rect" intensity={1.4} position={[0, 0.4, 5]} scale={[7, 0.8, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[0, 1, -6]} scale={5} color="#ffffff" />
      </Environment>
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[3.5, 5.5, 3]}
        intensity={2.1}
        color="#fff1d0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[-4, 2.5, -3]} intensity={0.9} color="#7f9bff" />

      <Grid
        position={[0, 0.001, 0]}
        args={[24, 24]}
        cellSize={0.25}
        cellThickness={0.6}
        cellColor={GOLD}
        sectionSize={1}
        sectionThickness={1.1}
        sectionColor={GOLD}
        fadeDistance={9}
        fadeStrength={1.6}
        infiniteGrid
      />
      <ContactShadows position={[0, 0.003, 0]} opacity={0.6} scale={6} blur={2.2} far={1.8} resolution={1024} color="#000000" />

      <group position={[0, 0, 0]}>
        <CadVehicleModel mode={mode} spin={!prefersReducedMotion} background={BG} edgeColor={GOLD} />
        {dimensions && (
          <>
            <Dimension from={[-halfL, 0.02, 0.62]} to={[halfL, 0.02, 0.62]} label={`${b.length.toFixed(2)} m`} />
            <Dimension from={[-halfL - 0.12, 0, 0.62]} to={[-halfL - 0.12, b.height, 0.62]} label={`${b.height.toFixed(2)} m`} />
          </>
        )}
      </group>

      <OrbitControls
        enabled={interactive}
        enablePan={false}
        enableZoom={zoomable}
        minDistance={2.2}
        maxDistance={6}
        autoRotate={rotate}
        autoRotateSpeed={0.8}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.02}
        target={[0, 0.55, 0]}
      />
    </CanvasWrapper>
  );
};

export default CadVehicleScene;
