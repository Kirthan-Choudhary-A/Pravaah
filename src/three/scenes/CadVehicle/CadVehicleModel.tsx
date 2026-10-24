/**
 * A two-wheeler built from solid primitives, drawn like a CAD model: lit PBR surfaces with
 * crisp edge lines on every part, plus a blueprint state where only the edges show.
 * `solid` runs from 0 (blueprint) to 1 (finished paint, chrome and rubber).
 *
 * Units are metres. The bike faces +x; the wheel axles run along z.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

type Vec3 = readonly [number, number, number];

export interface CadVehicleModelProps {
  /** 0 = blueprint lines only, 1 = fully rendered. */
  readonly solid: number;
  /** Spin the wheels. */
  readonly spin?: boolean;
  /** Edge-line colour. */
  readonly edgeColor?: string;
}

const WHEEL_R = 0.34;
const REAR_X = -0.66;
const FRONT_X = 0.68;

function useMaterials() {
  return useMemo(() => {
    const make = <T extends THREE.Material>(m: T): T => {
      m.transparent = true;
      return m;
    };
    return {
      paint: make(
        new THREE.MeshPhysicalMaterial({
          color: '#244a9e',
          metalness: 0.6,
          roughness: 0.26,
          clearcoat: 1,
          clearcoatRoughness: 0.06,
        })
      ),
      gold: make(
        new THREE.MeshPhysicalMaterial({ color: '#c8a24a', metalness: 1, roughness: 0.22, clearcoat: 0.6 })
      ),
      chrome: make(new THREE.MeshStandardMaterial({ color: '#d9dde4', metalness: 1, roughness: 0.12 })),
      steel: make(new THREE.MeshStandardMaterial({ color: '#8b93a3', metalness: 0.9, roughness: 0.34 })),
      engine: make(new THREE.MeshStandardMaterial({ color: '#2a303c', metalness: 0.8, roughness: 0.45 })),
      rubber: make(new THREE.MeshStandardMaterial({ color: '#0f1115', metalness: 0, roughness: 0.92 })),
      leather: make(new THREE.MeshStandardMaterial({ color: '#241b14', metalness: 0, roughness: 0.7 })),
      lens: make(
        new THREE.MeshStandardMaterial({
          color: '#fff4d1',
          emissive: '#ffd98a',
          emissiveIntensity: 1.1,
          metalness: 0.1,
          roughness: 0.1,
        })
      ),
      tail: make(
        new THREE.MeshStandardMaterial({ color: '#b3261e', emissive: '#7a0f0a', emissiveIntensity: 0.9 })
      ),
    };
  }, []);
}

type Materials = ReturnType<typeof useMaterials>;

/** A cylinder between two points. */
const Tube: React.FC<{
  readonly a: Vec3;
  readonly b: Vec3;
  readonly r: number;
  readonly material: THREE.Material;
  readonly edge: string;
  readonly radial?: number;
}> = ({ a, b, r, material, edge, radial = 14 }) => {
  const { position, quaternion, length } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { position: va.clone().add(vb).multiplyScalar(0.5), quaternion: q, length: len };
  }, [a, b]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[r, r, length, radial]} />
      <Edges threshold={30} color={edge} />
    </mesh>
  );
};

const Wheel: React.FC<{
  readonly x: number;
  readonly m: Materials;
  readonly edge: string;
  readonly spin: boolean;
}> = ({ x, m, edge, spin }) => {
  const rot = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (spin && rot.current) rot.current.rotation.z -= dt * 1.6;
  });
  return (
    <group position={[x, WHEEL_R, 0]}>
      <group ref={rot}>
        <mesh material={m.rubber}>
          <torusGeometry args={[0.265, 0.075, 28, 72]} />
          <Edges threshold={40} color={edge} />
        </mesh>
        <mesh material={m.chrome}>
          <torusGeometry args={[0.2, 0.016, 12, 72]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 5]} material={m.steel}>
            <boxGeometry args={[0.4, 0.03, 0.022]} />
            <Edges threshold={20} color={edge} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.gold}>
          <cylinderGeometry args={[0.058, 0.058, 0.13, 24]} />
          <Edges threshold={30} color={edge} />
        </mesh>
        <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}>
          <cylinderGeometry args={[0.15, 0.15, 0.008, 48]} />
        </mesh>
      </group>
    </group>
  );
};

export const CadVehicleModel: React.FC<CadVehicleModelProps> = ({
  solid,
  spin = true,
  edgeColor = '#e2c27d',
}) => {
  const m = useMaterials();

  // Fade the surfaces in and out; edges stay, so the model always reads as a drawing.
  useFrame(() => {
    for (const mat of Object.values(m)) {
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, solid, 0.12);
      mat.depthWrite = mat.opacity > 0.95;
      mat.visible = mat.opacity > 0.01;
    }
  });

  const E = edgeColor;
  return (
    <group position={[0, 0.0, 0]}>
      <Wheel x={REAR_X} m={m} edge={E} spin={spin} />
      <Wheel x={FRONT_X} m={m} edge={E} spin={spin} />

      {/* Frame */}
      <Tube a={[0.46, 0.84, 0]} b={[0.06, 0.38, 0]} r={0.028} material={m.steel} edge={E} />
      <Tube a={[0.06, 0.38, 0]} b={[-0.34, 0.38, 0]} r={0.026} material={m.steel} edge={E} />
      <Tube a={[-0.34, 0.38, 0]} b={[-0.52, 0.62, 0]} r={0.026} material={m.steel} edge={E} />
      <Tube a={[0.44, 0.9, 0]} b={[-0.46, 0.8, 0]} r={0.03} material={m.steel} edge={E} />
      <Tube a={[-0.46, 0.8, 0]} b={[REAR_X, WHEEL_R + 0.05, 0.1]} r={0.02} material={m.steel} edge={E} />
      <Tube a={[-0.46, 0.8, 0]} b={[REAR_X, WHEEL_R + 0.05, -0.1]} r={0.02} material={m.steel} edge={E} />
      {/* Swingarm */}
      <Tube a={[-0.3, 0.4, 0.1]} b={[REAR_X, WHEEL_R, 0.1]} r={0.022} material={m.steel} edge={E} />
      <Tube a={[-0.3, 0.4, -0.1]} b={[REAR_X, WHEEL_R, -0.1]} r={0.022} material={m.steel} edge={E} />
      {/* Rear shocks */}
      <Tube a={[-0.55, 0.78, 0.13]} b={[-0.46, 0.4, 0.11]} r={0.016} material={m.gold} edge={E} radial={10} />
      <Tube a={[-0.55, 0.78, -0.13]} b={[-0.46, 0.4, -0.11]} r={0.016} material={m.gold} edge={E} radial={10} />

      {/* Front fork and steering */}
      <Tube a={[0.5, 0.97, 0.1]} b={[FRONT_X, WHEEL_R, 0.1]} r={0.022} material={m.chrome} edge={E} />
      <Tube a={[0.5, 0.97, -0.1]} b={[FRONT_X, WHEEL_R, -0.1]} r={0.022} material={m.chrome} edge={E} />
      <Tube a={[0.62, 0.62, 0.1]} b={[FRONT_X, WHEEL_R, 0.1]} r={0.034} material={m.gold} edge={E} />
      <Tube a={[0.62, 0.62, -0.1]} b={[FRONT_X, WHEEL_R, -0.1]} r={0.034} material={m.gold} edge={E} />
      <Tube a={[0.46, 0.84, 0]} b={[0.52, 1.0, 0]} r={0.04} material={m.steel} edge={E} />

      {/* Handlebar and grips */}
      <Tube a={[0.5, 1.02, -0.34]} b={[0.5, 1.02, 0.34]} r={0.013} material={m.chrome} edge={E} radial={10} />
      <Tube a={[0.5, 1.02, 0.3]} b={[0.5, 1.02, 0.4]} r={0.022} material={m.rubber} edge={E} radial={10} />
      <Tube a={[0.5, 1.02, -0.3]} b={[0.5, 1.02, -0.4]} r={0.022} material={m.rubber} edge={E} radial={10} />

      {/* Headlight */}
      <mesh position={[0.64, 0.92, 0]} scale={[0.7, 1, 1]} material={m.chrome}>
        <sphereGeometry args={[0.115, 32, 24]} />
        <Edges threshold={40} color={E} />
      </mesh>
      <mesh position={[0.7, 0.92, 0]} rotation={[0, 0, -Math.PI / 2]} material={m.lens}>
        <circleGeometry args={[0.085, 32]} />
      </mesh>

      {/* Tank, seat, tail */}
      <mesh position={[0.1, 0.9, 0]} rotation={[0, 0, Math.PI / 2 + 0.06]} scale={[1, 1, 1.05]} material={m.paint}>
        <capsuleGeometry args={[0.135, 0.36, 10, 32]} />
        <Edges threshold={35} color={E} />
      </mesh>
      <mesh position={[0.1, 0.99, 0]} rotation={[0, 0, Math.PI / 2]} material={m.gold}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 24]} />
      </mesh>
      <RoundedBox args={[0.62, 0.09, 0.27]} radius={0.04} smoothness={5} position={[-0.32, 0.88, 0]} material={m.leather}>
        <Edges threshold={30} color={E} />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.06, 0.2]} radius={0.025} smoothness={4} position={[-0.7, 0.85, 0]} rotation={[0, 0, 0.12]} material={m.paint}>
        <Edges threshold={30} color={E} />
      </RoundedBox>
      <mesh position={[-0.88, 0.85, 0]} material={m.tail}>
        <boxGeometry args={[0.03, 0.04, 0.12]} />
      </mesh>

      {/* Mudguards */}
      <mesh position={[FRONT_X, WHEEL_R, 0]} rotation={[0, 0, 0.35]} material={m.paint}>
        <torusGeometry args={[0.37, 0.014, 10, 40, Math.PI * 0.62]} />
        <Edges threshold={30} color={E} />
      </mesh>
      <mesh position={[REAR_X, WHEEL_R, 0]} rotation={[0, 0, 0.2]} material={m.paint}>
        <torusGeometry args={[0.37, 0.014, 10, 40, Math.PI * 0.55]} />
        <Edges threshold={30} color={E} />
      </mesh>

      {/* Engine and exhaust */}
      <RoundedBox args={[0.36, 0.26, 0.24]} radius={0.03} smoothness={4} position={[0.0, 0.5, 0]} material={m.engine}>
        <Edges threshold={30} color={E} />
      </RoundedBox>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0.1 + i * 0.045, 0.66, 0]} rotation={[0, 0, -0.5]} material={m.steel}>
          <boxGeometry args={[0.012, 0.1, 0.2]} />
          <Edges threshold={30} color={E} />
        </mesh>
      ))}
      <Tube a={[0.1, 0.34, 0.1]} b={[-0.8, 0.3, 0.14]} r={0.04} material={m.chrome} edge={E} radial={20} />
      <mesh position={[-0.82, 0.3, 0.14]} rotation={[0, 0, Math.PI / 2]} material={m.steel}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 20]} />
      </mesh>
    </group>
  );
};

export const VEHICLE_BOUNDS = { length: 1.9, height: 1.2, wheelbase: FRONT_X - REAR_X };
