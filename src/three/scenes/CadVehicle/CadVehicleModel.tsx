/**
 * Renders the bike in one of four CAD-viewport modes:
 *  rendered   lit PBR surfaces with fine crease lines
 *  clay       one matte material, the way a modeller checks form
 *  wireframe  every triangle edge
 *  blueprint  hidden-line drawing: surfaces hide what is behind them, edges stay crisp
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildBike, FRONT_AXLE, REAR_AXLE, type MatKey, type PartDef } from './bikeGeometry';

export type ViewMode = 'rendered' | 'clay' | 'wireframe' | 'blueprint';

export interface CadVehicleModelProps {
  readonly mode: ViewMode;
  readonly spin?: boolean;
  readonly background?: string;
  readonly edgeColor?: string;
}

type MaterialSet = Record<MatKey, THREE.Material>;

function renderedMaterials(): MaterialSet {
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  return {
    paint: phys({ color: '#1b3a86', metalness: 0.7, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04 }),
    frame: phys({ color: '#0e1730', metalness: 0.6, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    gold: phys({ color: '#caa24c', metalness: 1, roughness: 0.22, clearcoat: 0.4 }),
    chrome: phys({ color: '#eceff4', metalness: 1, roughness: 0.06 }),
    steel: phys({ color: '#9ca4b3', metalness: 0.95, roughness: 0.32 }),
    alloy: phys({ color: '#c3c9d4', metalness: 1, roughness: 0.26 }),
    black: phys({ color: '#16181e', metalness: 0.5, roughness: 0.45 }),
    rubber: phys({ color: '#0d0e11', metalness: 0, roughness: 0.92 }),
    leather: phys({ color: '#2c2017', metalness: 0, roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#6b4a2e') }),
    lens: phys({ color: '#fff7dc', emissive: '#ffe3a0', emissiveIntensity: 1.2, metalness: 0, roughness: 0.04, clearcoat: 1 }),
    amber: phys({ color: '#ffb02e', emissive: '#ff8a00', emissiveIntensity: 0.9, roughness: 0.2 }),
    tail: phys({ color: '#c0281f', emissive: '#8a0f08', emissiveIntensity: 1, roughness: 0.2 }),
  };
}

function uniformMaterials(m: THREE.Material): MaterialSet {
  return {
    paint: m, frame: m, gold: m, chrome: m, steel: m, alloy: m, black: m,
    rubber: m, leather: m, lens: m, amber: m, tail: m,
  };
}

function useMaterialSets(background: string, edgeColor: string) {
  return useMemo(() => {
    const clay = new THREE.MeshStandardMaterial({ color: '#d9d1be', roughness: 0.85, metalness: 0 });
    const wire = new THREE.MeshBasicMaterial({ color: edgeColor, wireframe: true, transparent: true, opacity: 0.6 });
    // The fill of a hidden-line drawing: close to the paper colour, so surfaces hide what is behind them.
    const hidden = new THREE.MeshBasicMaterial({
      color: new THREE.Color(background).lerp(new THREE.Color('#23324f'), 0.35),
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    // Inverted hull: the back faces, pushed out a hair, show as a crisp silhouette line.
    const outline = new THREE.MeshBasicMaterial({ color: edgeColor, side: THREE.BackSide, toneMapped: false });
    outline.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        'vec3 transformed = position + normalize(normal) * 0.0032;'
      );
    };
    return {
      outline,
      rendered: renderedMaterials(),
      clay: uniformMaterials(clay),
      wireframe: uniformMaterials(wire),
      blueprint: uniformMaterials(hidden),
    } as const;
  }, [background, edgeColor]);
}

const Part: React.FC<{
  readonly def: PartDef;
  readonly mode: ViewMode;
  readonly sets: ReturnType<typeof useMaterialSets>;
  readonly lines: Record<ViewMode, THREE.LineBasicMaterial | null>;
}> = ({ def, mode, sets, lines }) => {
  const edges = useMemo(
    () =>
      def.edge === false
        ? mode === 'blueprint'
          ? new THREE.EdgesGeometry(def.geo, 45) // smooth parts: only their real creases
          : null
        : new THREE.EdgesGeometry(def.geo, def.edge),
    [def.geo, def.edge, mode]
  );
  const lineMat = lines[mode];
  return (
    <>
      <mesh geometry={def.geo} material={sets[mode][def.mat]} castShadow receiveShadow />
      {mode === 'blueprint' && <mesh geometry={def.geo} material={sets.outline} />}
      {edges && lineMat && <lineSegments geometry={edges} material={lineMat} />}
    </>
  );
};

export const CadVehicleModel: React.FC<CadVehicleModelProps> = ({
  mode,
  spin = true,
  background = '#0b1220',
  edgeColor = '#e2c27d',
}) => {
  const bike = useMemo(() => buildBike(), []);
  const sets = useMaterialSets(background, edgeColor);
  const lines = useMemo<Record<ViewMode, THREE.LineBasicMaterial | null>>(
    () => ({
      rendered: new THREE.LineBasicMaterial({ color: '#05080f', transparent: true, opacity: 0.38 }),
      clay: new THREE.LineBasicMaterial({ color: '#4a4436', transparent: true, opacity: 0.75 }),
      wireframe: null,
      blueprint: new THREE.LineBasicMaterial({ color: edgeColor }),
    }),
    [edgeColor]
  );

  const front = useRef<THREE.Group>(null);
  const rear = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!spin) return;
    const d = dt * 1.5;
    if (front.current) front.current.rotation.z -= d;
    if (rear.current) rear.current.rotation.z -= d;
  });

  useEffect(
    () => () => {
      for (const [key, set] of Object.entries(sets)) {
        if (key === 'outline') (set as THREE.Material).dispose();
        else for (const m of new Set(Object.values(set as MaterialSet))) m.dispose();
      }
      for (const l of Object.values(lines)) l?.dispose();
    },
    [sets, lines]
  );

  const body = bike.parts.filter((p) => !p.group);
  const frontParts = bike.parts.filter((p) => p.group === 'front');
  const rearParts = bike.parts.filter((p) => p.group === 'rear');

  return (
    <group>
      {body.map((p) => (
        <Part key={p.id} def={p} mode={mode} sets={sets} lines={lines} />
      ))}
      <group ref={front} position={FRONT_AXLE.toArray()}>
        {frontParts.map((p) => (
          <Part key={p.id} def={p} mode={mode} sets={sets} lines={lines} />
        ))}
      </group>
      <group ref={rear} position={REAR_AXLE.toArray()}>
        {rearParts.map((p) => (
          <Part key={p.id} def={p} mode={mode} sets={sets} lines={lines} />
        ))}
      </group>
    </group>
  );
};

export { buildBike };
