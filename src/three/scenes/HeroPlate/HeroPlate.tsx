import React, { useState, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { CanvasWrapper } from '../../CanvasWrapper';
import { HeroPlateScene } from './HeroPlateScene';
import { HeroPlateFallback } from './HeroPlateFallback';
import { useDeviceCapabilities } from '../../../hooks/useDeviceCapabilities';
import styles from './HeroPlate.module.css';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface HeroPlateProps {
  readonly expiryDaysBefore?: number;
}

export const HeroPlate: React.FC<HeroPlateProps> = ({
  expiryDaysBefore = 16,
}) => {
  const { tier, isTouch, prefersReducedMotion } = useDeviceCapabilities();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });

  // Annotations opacity refs
  const anno1Ref = useRef<HTMLDivElement>(null);
  const anno2Ref = useRef<HTMLDivElement>(null);
  const anno3Ref = useRef<HTMLDivElement>(null);

  // GSAP ScrollTrigger timeline on desktop / tablet without reduced motion
  useGSAP(
    () => {
      if (
        prefersReducedMotion ||
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
      )
        return;

      const isMobile = window.innerWidth < 768;
      if (isMobile) return;

      const trigger = ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: 'top top',
        end: '+=150%',
        pin: stickyRef.current,
        scrub: 0.5,
        onUpdate: (self) => {
          const p = self.progress;
          setScrollProgress(p);

          // Animate annotations visibility smoothly
          if (anno1Ref.current && anno2Ref.current && anno3Ref.current) {
            // Step 1: Heard (0 to 0.35)
            const a1 = p < 0.35 ? 1 : Math.max(0, 1 - (p - 0.35) * 6);
            anno1Ref.current.style.opacity = a1.toString();
            anno1Ref.current.style.transform = `translateY(${(1 - a1) * -8}px)`;

            // Step 2: Fix (0.35 to 0.7)
            const a2 = p >= 0.35 && p < 0.7 ? 1 : p < 0.35 ? Math.max(0, (p - 0.2) * 6) : Math.max(0, 1 - (p - 0.7) * 6);
            anno2Ref.current.style.opacity = a2.toString();
            anno2Ref.current.style.transform = `translateY(${(1 - a2) * 8}px)`;

            // Step 3: Card renewed (0.7 to 1.0)
            const a3 = p >= 0.7 ? 1 : Math.max(0, (p - 0.6) * 6);
            anno3Ref.current.style.opacity = a3.toString();
            anno3Ref.current.style.transform = `translateY(${(1 - a3) * 8}px)`;
          }
        },
      });

      return () => trigger.kill();
    },
    { scope: wrapperRef, dependencies: [prefersReducedMotion] }
  );

  // Pointer move handler for subtle 3D tilt
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isTouch || prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setPointerPos({ x, y });
  };

  const handlePointerLeave = () => {
    setPointerPos({ x: 0, y: 0 });
  };

  const isStaticMode = prefersReducedMotion;

  return (
    <div
      ref={wrapperRef}
      className={styles.heroScrollWrapper}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div ref={stickyRef} className={styles.stickyContainer}>
        <div className={styles.canvasArea}>
          <CanvasWrapper
            fallback={<HeroPlateFallback expiryDaysBefore={expiryDaysBefore} />}
            tier={tier}
            camera={{ position: [0, 0.2, 4.6], fov: 35 }}
            ariaLabel="Interactive 3D registration plate showing look-alike correction and driving licence card"
          >
            <HeroPlateScene
              progress={isStaticMode ? 1.0 : scrollProgress}
              pointerPos={pointerPos}
              tier={tier}
              isTouch={isTouch}
              expiryDaysBefore={expiryDaysBefore}
            />
          </CanvasWrapper>
        </div>

        {/* Dynamic HTML Annotations Overlay */}
        {!isStaticMode && (
          <div className={styles.annotationsOverlay} aria-hidden="true">
            <div
              ref={anno1Ref}
              className={`${styles.annotationCard} ${styles.annotationTop}`}
              style={{ opacity: 1 }}
            >
              <span className={styles.annotationStep}>1. Heard Transcript</span>
              <span className={styles.annotationText}>Heard: "kay ay oh three…"</span>
            </div>

            <div
              ref={anno2Ref}
              className={`${styles.annotationCard} ${styles.annotationMiddle}`}
              style={{ opacity: 0 }}
            >
              <span className={styles.annotationStep}>2. Phonetic Correction</span>
              <span className={styles.annotationText}>O changed to 0 – the RTO part must be digits</span>
            </div>

            <div
              ref={anno3Ref}
              className={`${styles.annotationCard} ${styles.annotationBottom}`}
              style={{ opacity: 0 }}
            >
              <span className={styles.annotationStep}>3. Ordered Plan</span>
              <span className={styles.annotationText}>
                Licence renewed online – Safe, {expiryDaysBefore} days before expiry (SIMULATED)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
