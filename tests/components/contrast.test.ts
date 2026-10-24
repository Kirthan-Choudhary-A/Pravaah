import { describe, it, expect } from 'vitest';

/**
 * WCAG AA Contrast Test
 * Verifies that all status colors achieve >= 4.5:1 contrast against --paper (#FAF9F5).
 */

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('WCAG AA Contrast Verification', () => {
  const PAPER_BACKGROUND = '#FAF9F5';

  const STATUS_COLORS: Record<string, string> = {
    '--status-safe': '#2E5328',
    '--status-risk': '#7A4B00',
    '--status-missed': '#962828',
    '--status-unknown': '#52544E',
  };

  for (const [tokenName, hexValue] of Object.entries(STATUS_COLORS)) {
    it(`${tokenName} (${hexValue}) satisfies WCAG AA >= 4.5:1 on --paper (${PAPER_BACKGROUND})`, () => {
      const contrast = getContrastRatio(hexValue, PAPER_BACKGROUND);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  }
});
