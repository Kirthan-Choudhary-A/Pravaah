import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { StudioLighting } from '../../lighting/StudioLighting';
import type { QualityTier } from '../../../hooks/useDeviceCapabilities';
import type { ArchitectureLayerInfo } from './ArchitectureStackFallback';

export interface ArchitectureStackSceneProps {
  readonly layers: readonly ArchitectureLayerInfo[];
  readonly selectedLayerId: string;
  readonly onSelectLayer: (id: string) => void;
  readonly tier?: QualityTier | undefined;
}

function createLayerLabelTexture(text: string, isSelected: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = isSelected ? '#242522' : '#f3f0e8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = isSelected ? '#faf9f5' : '#b7b0a3';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSelected ? '#faf9f5' : '#242522';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createSpineLabelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#777965';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#faf9f5';
    ctx.fillText('PRIVACY & SECURITY SPINE', canvas.width / 2, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

export const ArchitectureStackScene: React.FC<ArchitectureStackSceneProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  tier = 'full',
}) => {
  const spineTex = useMemo(() => createSpineLabelTexture(), []);

  const layerTextures = useMemo(() => {
    const map = new Map<string, { normal: THREE.CanvasTexture; selected: THREE.CanvasTexture }>();
    layers.forEach((layer) => {
      map.set(layer.id, {
        normal: createLayerLabelTexture(layer.name, false),
        selected: createLayerLabelTexture(layer.name, true),
      });
    });
    return map;
  }, [layers]);

  useEffect(() => {
    return () => {
      spineTex.dispose();
      layerTextures.forEach((pair) => {
        pair.normal.dispose();
        pair.selected.dispose();
      });
    };
  }, [spineTex, layerTextures]);

  return (
    <>
      <StudioLighting tier={tier} shadowOffset={-1.8} />

      <group position={[0.2, 0, 0]} rotation={[0.2, -0.35, 0]}>
        {/* ============================================================== */}
        {/* VERTICAL SECURITY & PRIVACY SPINE */}
        {/* ============================================================== */}
        <group position={[-2.2, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.35, 3.2, 1.8]} />
            <meshStandardMaterial
              color="#777965"
              roughness={0.6}
              metalness={0.1}
            />
          </mesh>
          <lineSegments position={[0, 0, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(0.35, 3.2, 1.8)]} />
            <lineBasicMaterial color="#343531" />
          </lineSegments>

          {/* Spine vertical canvas label */}
          <mesh position={[0, 0, 0.91]} rotation={[0, 0, -Math.PI / 2]}>
            <planeGeometry args={[2.8, 0.32]} />
            <meshBasicMaterial map={spineTex} transparent />
          </mesh>
        </group>

        {/* ============================================================== */}
        {/* FOUR ARCHITECTURE LAYERS (Bottom to Top) */}
        {/* ============================================================== */}
        {layers.map((layer, idx) => {
          // Bottom layer is index 0 (Data), top is index 3 (Screens)
          // Y positions: -1.05, -0.35, 0.35, 1.05
          const yPos = -1.05 + (3 - idx) * 0.7;
          const isSelected = selectedLayerId === layer.id;
          const texPair = layerTextures.get(layer.id);
          const currentTex = isSelected ? texPair?.selected : texPair?.normal;

          return (
            <group
              key={layer.id}
              position={[0.2, yPos, 0]}
              onClick={(e) => {
                e.stopPropagation();
                onSelectLayer(layer.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
              }}
            >
              {/* Layer slab */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[3.6, 0.35, 2.0]} />
                <meshStandardMaterial
                  color={isSelected ? '#242522' : '#f3f0e8'}
                  roughness={0.5}
                  metalness={0.05}
                />
              </mesh>

              {/* Edge definition */}
              <lineSegments position={[0, 0, 0]}>
                <edgesGeometry args={[new THREE.BoxGeometry(3.6, 0.35, 2.0)]} />
                <lineBasicMaterial color={isSelected ? '#faf9f5' : '#b7b0a3'} />
              </lineSegments>

              {/* Front Face Texture Label */}
              {currentTex && (
                <mesh position={[0, 0, 1.01]}>
                  <planeGeometry args={[3.2, 0.3]} />
                  <meshBasicMaterial map={currentTex} transparent />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    </>
  );
};
