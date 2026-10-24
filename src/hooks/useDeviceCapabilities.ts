import { useState, useEffect } from 'react';

export type QualityTier = 'full' | 'lite' | 'fallback';

export interface DeviceCapabilities {
  readonly tier: QualityTier;
  readonly hasWebGL: boolean;
  readonly isTouch: boolean;
  readonly prefersReducedMotion: boolean;
  readonly hardwareConcurrency: number;
  readonly deviceMemory?: number | undefined;
  readonly saveData: boolean;
}

function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('WebGLRenderingContext' in window) && !('WebGL2RenderingContext' in window)) return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return Boolean(
      (gl && gl instanceof WebGLRenderingContext) ||
        (window.WebGL2RenderingContext && gl instanceof WebGL2RenderingContext)
    );
  } catch {
    return false;
  }
}

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(() => {
    if (typeof window === 'undefined') {
      return {
        tier: 'fallback',
        hasWebGL: false,
        isTouch: false,
        prefersReducedMotion: true,
        hardwareConcurrency: 4,
        saveData: false,
      };
    }

    const hasWebGL = detectWebGL();
    const isTouch = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)').matches : false;
    const prefersReducedMotion = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    const nav = navigator as unknown as {
      hardwareConcurrency?: number;
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };

    const hardwareConcurrency = nav.hardwareConcurrency ?? 4;
    const deviceMemory = nav.deviceMemory;
    const saveData = Boolean(nav.connection?.saveData);

    // Determine quality tier
    let tier: QualityTier = 'full';
    if (!hasWebGL || saveData || (deviceMemory !== undefined && deviceMemory <= 2) || hardwareConcurrency <= 2) {
      tier = 'fallback';
    } else if (isTouch || (deviceMemory !== undefined && deviceMemory <= 4) || hardwareConcurrency <= 4) {
      tier = 'lite';
    }

    return {
      tier,
      hasWebGL,
      isTouch,
      prefersReducedMotion,
      hardwareConcurrency,
      deviceMemory,
      saveData,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const pointerQuery = window.matchMedia('(pointer: coarse)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      const hasWebGL = detectWebGL();
      const isTouch = pointerQuery.matches;
      const prefersReducedMotion = motionQuery.matches;

      const nav = navigator as unknown as {
        hardwareConcurrency?: number;
        deviceMemory?: number;
        connection?: { saveData?: boolean };
      };

      const hardwareConcurrency = nav.hardwareConcurrency ?? 4;
      const deviceMemory = nav.deviceMemory;
      const saveData = Boolean(nav.connection?.saveData);

      let tier: QualityTier = 'full';
      if (!hasWebGL || saveData || (deviceMemory !== undefined && deviceMemory <= 2) || hardwareConcurrency <= 2) {
        tier = 'fallback';
      } else if (isTouch || (deviceMemory !== undefined && deviceMemory <= 4) || hardwareConcurrency <= 4) {
        tier = 'lite';
      }

      setCapabilities({
        tier,
        hasWebGL,
        isTouch,
        prefersReducedMotion,
        hardwareConcurrency,
        deviceMemory,
        saveData,
      });
    };

    pointerQuery.addEventListener('change', update);
    motionQuery.addEventListener('change', update);

    return () => {
      pointerQuery.removeEventListener('change', update);
      motionQuery.removeEventListener('change', update);
    };
  }, []);

  return capabilities;
}
