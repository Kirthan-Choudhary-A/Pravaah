import React from 'react';
import { ContactShadows } from '@react-three/drei';
import type { QualityTier } from '../../hooks/useDeviceCapabilities';

export interface StudioLightingProps {
  readonly tier?: QualityTier;
  readonly shadowOffset?: number;
  readonly contactShadows?: boolean;
}

export const StudioLighting: React.FC<StudioLightingProps> = ({
  tier = 'full',
  shadowOffset = -0.6,
  contactShadows = true,
}) => {
  const isLite = tier === 'lite';

  return (
    <>
      {/* Neutral ambient fill */}
      <ambientLight intensity={0.8} color="#faf9f5" />

      {/* Primary Key Light from upper left with soft shadow */}
      <directionalLight
        position={[-4, 6, 4]}
        intensity={1.2}
        color="#ffffff"
        castShadow={!isLite}
        shadow-mapSize-width={isLite ? 512 : 1024}
        shadow-mapSize-height={isLite ? 512 : 1024}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0001}
      />

      {/* Soft secondary bounce light from opposite side */}
      <directionalLight position={[4, -2, -2]} intensity={0.35} color="#f3f0e8" />

      {/* Gentle rim light to delineate matte edges */}
      <directionalLight position={[0, 4, -5]} intensity={0.3} color="#ffffff" />

      {/* Subtle contact shadows under objects */}
      {contactShadows && (
        <ContactShadows
          position={[0, shadowOffset, 0]}
          opacity={0.4}
          scale={10}
          blur={2.0}
          far={4}
          resolution={isLite ? 256 : 512}
          color="#242522"
        />
      )}
    </>
  );
};
