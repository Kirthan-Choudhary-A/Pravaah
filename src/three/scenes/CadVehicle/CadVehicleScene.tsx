import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Environment, Lightformer, ContactShadows, OrbitControls, Line, Grid } from '@react-three/drei';
import { CanvasWrapper } from '../../CanvasWrapper';
import { useDeviceCapabilities } from '../../../hooks/useDeviceCapabilities';
import { CadVehicleModel, VEHICLE_BOUNDS } from './CadVehicleModel';
import { CadVehicleFallback } from './CadVehicleFallback';

export interface CadVehicleSceneProps {
  /** 0 = blueprint lines, 1 = finished render. Animate this for an assemble effect. */
  readonly solid?: number;
  readonly autoRotate?: boolean;
  /** Let the visitor drag to turn the model. */
  readonly interactive?: boolean;
  /** Draw the length / height / wheelbase dimension lines. */
  readonly dimensions?: boolean;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

const GOLD = '#e2c27d';

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
      ctx.fillStyle = 'rgba(11,18,32,0.82)';
      ctx.strokeStyle = 'rgba(226,194,125,0.7)';
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
    <sprite position={position} scale={[0.17 * aspect, 0.17, 1]} renderOrder={10}>
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
  return (
    <group>
      <Line points={[from, to]} color={GOLD} lineWidth={1} transparent opacity={0.85} />
      <Label text={label} position={mid} />
    </group>
  );
};

/** A premium CAD-style two-wheeler: dark studio, brass edge lines, soft reflections. */
export const CadVehicleScene: React.FC<CadVehicleSceneProps> = ({
  solid = 1,
  autoRotate = true,
  interactive = true,
  dimensions = true,
  ariaLabel = 'Interactive 3D model of a two-wheeler. Drag to turn it.',
  className,
  style,
}) => {
  const { prefersReducedMotion } = useDeviceCapabilities();
  const rotate = autoRotate && !prefersReducedMotion;
  const b = VEHICLE_BOUNDS;

  return (
    <CanvasWrapper
      className={className ?? ''}
      {...(style ? { style } : {})}
      ariaLabel={ariaLabel}
      camera={{ position: [2.35, 1.1, 2.7], fov: 30, near: 0.1, far: 60 }}
      fallback={<CadVehicleFallback />}
    >
      <color attach="background" args={['#0b1220']} />
      <fog attach="fog" args={['#0b1220', 7, 16]} />

      {/* Reflections without any network fetch: soft boxes built in code. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 2]} scale={[8, 3, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.6} position={[-5, 2, 0]} scale={[4, 3, 1]} rotation-y={Math.PI / 2} color="#ffe2a8" />
        <Lightformer form="rect" intensity={1.3} position={[5, 1, -2]} scale={[4, 2, 1]} rotation-y={-Math.PI / 2} color="#a9c4ff" />
        <Lightformer form="ring" intensity={1.1} position={[0, 1, -6]} scale={5} color="#ffffff" />
      </Environment>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 3]} intensity={1.6} color="#fff1d0" />
      <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#7f9bff" />

      <Grid
        position={[0, 0.001, 0]}
        args={[24, 24]}
        cellSize={0.25}
        cellThickness={0.6}
        cellColor="#e2c27d"
        sectionSize={1}
        sectionThickness={1.1}
        sectionColor="#e2c27d"
        fadeDistance={9}
        fadeStrength={1.6}
        infiniteGrid
      />
      <ContactShadows position={[0, 0.002, 0]} opacity={0.55} scale={7} blur={2.4} far={2.2} color="#000000" />

      <group position={[0, 0, 0]}>
        <CadVehicleModel solid={solid} spin={!prefersReducedMotion} />
        {dimensions && (
          <>
            <Dimension from={[-0.99, 0.02, 0.9]} to={[1.01, 0.02, 0.9]} label={`${b.length.toFixed(2)} m`} />
            <Dimension from={[-1.12, 0, 0.9]} to={[-1.12, b.height, 0.9]} label={`${b.height.toFixed(2)} m`} />
          </>
        )}
      </group>

      <OrbitControls
        enabled={interactive}
        enablePan={false}
        enableZoom={false}
        autoRotate={rotate}
        autoRotateSpeed={0.9}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0.52, 0]}
      />
    </CanvasWrapper>
  );
};

export default CadVehicleScene;
