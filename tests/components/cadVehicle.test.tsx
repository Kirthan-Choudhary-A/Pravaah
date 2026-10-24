import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as THREE from 'three';
import { buildBike, WHEEL_R } from '../../src/three/scenes/CadVehicle/bikeGeometry';
import { CadVehicleViewer } from '../../src/three/scenes/CadVehicle/CadVehicleViewer';

describe('Bike geometry', () => {
  const bike = buildBike();

  it('is a real bike in real proportions', () => {
    expect(bike.bounds.length).toBeGreaterThan(1.8);
    expect(bike.bounds.length).toBeLessThan(2.5);
    expect(bike.bounds.height).toBeGreaterThan(1.0);
    expect(bike.bounds.height).toBeLessThan(1.6);
    expect(bike.bounds.wheelbase).toBeGreaterThan(1.2);
    expect(bike.bounds.wheelbase).toBeLessThan(1.6);
  });

  it('has both wheels as spinning groups and a full set of detailed parts', () => {
    const ids = bike.parts.map((p) => p.id);
    for (const needed of ['front-tyre', 'rear-tyre', 'front-rim', 'front-disc', 'springs', 'chain', 'engine-fins', 'tank', 'seat', 'muffler', 'headlight-lens']) {
      expect(ids, needed).toContain(needed);
    }
    expect(bike.parts.filter((p) => p.group === 'front').length).toBeGreaterThan(4);
    expect(bike.parts.filter((p) => p.group === 'rear').length).toBeGreaterThan(4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has finite geometry everywhere and tyres that touch the ground', () => {
    for (const p of bike.parts) {
      const pos = p.geo.getAttribute('position');
      expect(pos.count, p.id).toBeGreaterThan(0);
      let bad = -1;
      for (let i = 0; i < pos.array.length; i++) {
        if (!Number.isFinite(pos.array[i])) {
          bad = i;
          break;
        }
      }
      expect(bad, `${p.id} has a non-finite vertex`).toBe(-1);
    }
    const tyre = bike.parts.find((p) => p.id === 'front-tyre')!;
    tyre.geo.computeBoundingBox();
    expect(tyre.geo.boundingBox!.max.y).toBeCloseTo(WHEEL_R, 2);
    expect(bike.parts.reduce((n, p) => n + p.geo.getAttribute('position').count / 3, 0)).toBeGreaterThan(20000);
  });

  it('can build crease lines for every part (used by the CAD edge view)', () => {
    for (const p of bike.parts) expect(() => new THREE.EdgesGeometry(p.geo, 30)).not.toThrow();
  });
});

describe('Viewer toolbar', () => {
  it('switches between the four display modes and toggles aids', () => {
    render(<CadVehicleViewer />);
    const rendered = screen.getByRole('button', { name: 'Rendered' });
    expect(rendered).toHaveAttribute('aria-pressed', 'true');
    for (const name of ['Clay', 'Wireframe', 'Blueprint']) {
      fireEvent.click(screen.getByRole('button', { name }));
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
      expect(rendered).toHaveAttribute('aria-pressed', 'false');
    }
    const dims = screen.getByLabelText('Dimensions') as HTMLInputElement;
    expect(dims.checked).toBe(true);
    fireEvent.click(dims);
    expect(dims.checked).toBe(false);
    expect(screen.getByLabelText('Turntable')).toBeChecked();
  });
});
