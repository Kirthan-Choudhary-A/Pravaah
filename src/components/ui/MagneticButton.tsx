import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';
import styles from './MagneticButton.module.css';

export interface MagneticButtonProps {
  readonly children: React.ReactNode;
  readonly href?: string | undefined;
  readonly onClick?: (() => void) | undefined;
  readonly className?: string | undefined;
  readonly variant?: 'primary' | 'secondary' | undefined;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  href,
  onClick,
  className = '',
  variant = 'primary',
}) => {
  const { isTouch, prefersReducedMotion } = useDeviceCapabilities();
  const btnRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isTouch || prefersReducedMotion || !btnRef.current) return;

    const rect = btnRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Subtle magnetic pull (max 6px)
    const deltaX = (e.clientX - centerX) * 0.18;
    const deltaY = (e.clientY - centerY) * 0.18;

    const clampedX = Math.max(-6, Math.min(6, deltaX));
    const clampedY = Math.max(-6, Math.min(6, deltaY));

    setOffset({ x: clampedX, y: clampedY });
  };

  const handlePointerLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  const transformStyle = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
  };

  const btnClasses = `${styles.magneticBtn} ${variant === 'secondary' ? styles.secondary : ''}`;

  if (href) {
    return (
      <div
        ref={btnRef}
        className={`${styles.magneticWrapper} ${className}`}
        style={transformStyle}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <Link to={href} className={btnClasses} onClick={onClick}>
          {children}
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={btnRef}
      className={`${styles.magneticWrapper} ${className}`}
      style={transformStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <button type="button" className={btnClasses} onClick={onClick}>
        {children}
      </button>
    </div>
  );
};
