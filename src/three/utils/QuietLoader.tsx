import React from 'react';
import { useProgress } from '@react-three/drei';

export interface QuietLoaderProps {
  readonly message?: string;
}

export const QuietLoader: React.FC<QuietLoaderProps> = ({
  message = 'Preparing 3D scene…',
}) => {
  const { progress } = useProgress();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        backgroundColor: 'var(--paper)',
        color: 'var(--charcoal)',
        fontSize: 'var(--font-size-xs)',
        fontFamily: 'var(--font-sans)',
        zIndex: 5,
      }}
    >
      <div
        style={{
          width: '120px',
          height: '2px',
          backgroundColor: 'var(--stone)',
          overflow: 'hidden',
          borderRadius: '1px',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.round(progress)}%`,
            backgroundColor: 'var(--graphite)',
            transition: 'width 0.2s ease',
          }}
        />
      </div>
      <span>{progress < 100 ? `${message} ${Math.round(progress)}%` : 'Ready'}</span>
    </div>
  );
};
