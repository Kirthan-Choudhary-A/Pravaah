import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { StudioLighting } from '../../lighting/StudioLighting';
import type { QualityTier } from '../../../hooks/useDeviceCapabilities';

export interface HeroPlateSceneProps {
  readonly progress: number; // 0 to 1 scroll progress from GSAP
  readonly pointerPos: { x: number; y: number };
  readonly tier?: QualityTier;
  readonly isTouch?: boolean;
  readonly expiryDaysBefore?: number;
}

// Helper to generate crisp canvas texture for the registration plate
function createPlateTexture(plateNumber: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Brushed aluminium gradient background
  const grad = ctx.createLinearGradient(0, 0, 1024, 256);
  grad.addColorStop(0, '#f9f8f4');
  grad.addColorStop(0.5, '#ede9de');
  grad.addColorStop(1, '#e3dfd3');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);

  // Outer border
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#242522';
  ctx.strokeRect(8, 8, 1008, 240);

  // Inner subtle groove
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#b7b0a3';
  ctx.strokeRect(18, 18, 988, 220);

  // Characters
  ctx.fillStyle = '#171815';
  ctx.font = 'bold 136px "IBM Plex Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '10px';
  ctx.fillText(plateNumber, 512, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Helper to generate crisp canvas texture for the generic PVC licence card
function createCardTexture(expiryDaysBefore: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext('2d')!;

  // Matte PVC surface
  ctx.fillStyle = '#f3f0e8';
  ctx.fillRect(0, 0, 800, 500);

  // Subtle border
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#b7b0a3';
  ctx.strokeRect(4, 4, 792, 492);

  // Watermark text
  ctx.fillStyle = '#777965';
  ctx.font = 'bold 22px "IBM Plex Sans", sans-serif';
  ctx.fillText('SAMPLE – NOT A REAL LICENCE', 40, 60);

  // Chip placeholder
  ctx.fillStyle = '#d8d3c5';
  ctx.strokeStyle = '#b7b0a3';
  ctx.lineWidth = 2;
  ctx.fillRect(40, 90, 90, 70);
  ctx.strokeRect(40, 90, 90, 70);

  // Licence details
  ctx.fillStyle = '#5a5c56';
  ctx.font = '20px "IBM Plex Sans", sans-serif';
  ctx.fillText('LICENCE IDENTIFIER', 160, 115);

  ctx.fillStyle = '#171815';
  ctx.font = 'bold 36px "IBM Plex Mono", monospace';
  ctx.fillText('DEMO-••••-1234', 160, 155);

  ctx.fillStyle = '#5a5c56';
  ctx.font = '20px "IBM Plex Sans", sans-serif';
  ctx.fillText('CATEGORY', 40, 220);

  ctx.fillStyle = '#242522';
  ctx.font = 'bold 28px "IBM Plex Sans", sans-serif';
  ctx.fillText('LMV (CAR) / TWO-WHEELER', 40, 255);

  ctx.fillStyle = '#5a5c56';
  ctx.font = '20px "IBM Plex Sans", sans-serif';
  ctx.fillText('STATUS', 40, 320);

  ctx.fillStyle = '#2e5328';
  ctx.font = 'bold 30px "IBM Plex Sans", sans-serif';
  ctx.fillText(`Safe (Renewed online – ${expiryDaysBefore}d before expiry)`, 40, 360);

  ctx.fillStyle = '#777965';
  ctx.font = 'italic 18px "IBM Plex Sans", sans-serif';
  ctx.fillText('Simulation model for ImpactX 2026 Challenge 09', 40, 440);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const HeroPlateScene: React.FC<HeroPlateSceneProps> = ({
  progress,
  pointerPos,
  tier = 'full',
  isTouch = false,
  expiryDaysBefore = 16,
}) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // Generate textures once
  const initialPlateTex = useMemo(() => createPlateTexture('KA O3 MJ 4578'), []);
  const correctedPlateTex = useMemo(() => createPlateTexture('KA 03 MJ 4578'), []);
  const cardTex = useMemo(() => createCardTexture(expiryDaysBefore), [expiryDaysBefore]);

  // Clean up textures on unmount
  React.useEffect(() => {
    return () => {
      initialPlateTex.dispose();
      correctedPlateTex.dispose();
      cardTex.dispose();
    };
  }, [initialPlateTex, correctedPlateTex, cardTex]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Pointer-based subtle tilt (max 4 degrees ~ 0.07 rad) on fine pointers
    if (!isTouch) {
      const targetRotX = pointerPos.y * 0.06;
      const targetRotY = pointerPos.x * 0.07;
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetRotX, 4, delta);
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetRotY, 4, delta);
    }

    // Camera animation based on scroll progress:
    // progress [0, 0.35]: Focus on Plate with "O"
    // progress [0.35, 0.70]: "O" flips/changes to "0"
    // progress [0.70, 1.0]: Camera eases to focus on the PVC Card
    if (progress < 0.6) {
      // Focus on plate
      camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 3, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.2, 3, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, 4.6, 3, delta);
    } else {
      // Ease camera towards the licence card
      const cardFactor = (progress - 0.6) / 0.4;
      const targetCamX = 0.6 * cardFactor;
      const targetCamY = -0.3 * cardFactor;
      const targetCamZ = 4.6 - 0.7 * cardFactor;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 3, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 3, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 3, delta);
    }
  });

  // Determine whether plate shows O or 0 based on progress
  const activePlateTex = progress >= 0.45 ? correctedPlateTex : initialPlateTex;

  return (
    <>
      <StudioLighting tier={tier} shadowOffset={-1.2} />

      <group ref={groupRef} position={[0, 0, 0]}>
        {/* ============================================================== */}
        {/* 1. REGISTRATION PLATE MESH */}
        {/* ============================================================== */}
        <group position={[0, 0.3, 0]} rotation={[0.08, -0.12, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.2, 1.05, 0.05]} />
            <meshStandardMaterial
              map={activePlateTex}
              roughness={0.4}
              metalness={0.2}
              color="#ffffff"
            />
          </mesh>

          {/* Thin raised bevel edge border */}
          <lineSegments position={[0, 0, 0.026]}>
            <edgesGeometry args={[new THREE.BoxGeometry(4.2, 1.05, 0.05)]} />
            <lineBasicMaterial color="#343531" linewidth={2} />
          </lineSegments>
        </group>

        {/* ============================================================== */}
        {/* 2. GENERIC PVC DRIVING LICENCE CARD */}
        {/* ============================================================== */}
        <group position={[0.7, -0.65, 0.35]} rotation={[-0.1, 0.16, 0.04]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.5, 1.55, 0.025]} />
            <meshStandardMaterial
              map={cardTex}
              roughness={0.65}
              metalness={0.05}
              color="#ffffff"
            />
          </mesh>

          {/* Subtle perimeter edge */}
          <lineSegments position={[0, 0, 0.013]}>
            <edgesGeometry args={[new THREE.BoxGeometry(2.5, 1.55, 0.025)]} />
            <lineBasicMaterial color="#b7b0a3" linewidth={1} />
          </lineSegments>
        </group>
      </group>
    </>
  );
};
