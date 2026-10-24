/**
 * Geometry for a detailed two-wheeler, built in code and merged into a handful of parts per
 * material. Units are metres. The bike faces +x, y is up, the wheel axles run along z.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type MatKey =
  | 'paint'
  | 'frame'
  | 'gold'
  | 'chrome'
  | 'steel'
  | 'alloy'
  | 'black'
  | 'rubber'
  | 'leather'
  | 'lens'
  | 'amber'
  | 'tail';

export interface PartDef {
  readonly id: string;
  readonly geo: THREE.BufferGeometry;
  readonly mat: MatKey;
  /** Crease angle in degrees for the CAD edge lines; false draws none (smooth organic parts). */
  readonly edge: number | false;
  /** Parts in a wheel group spin with it and are positioned relative to its axle. */
  readonly group?: 'front' | 'rear';
}

export const WHEEL_R = 0.336;
export const REAR_AXLE = new THREE.Vector3(-0.68, WHEEL_R, 0);
export const FRONT_AXLE = new THREE.Vector3(0.7, WHEEL_R, 0);

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function place(
  g: THREE.BufferGeometry,
  p: readonly [number, number, number] = [0, 0, 0],
  r: readonly [number, number, number] = [0, 0, 0],
  s: readonly [number, number, number] = [1, 1, 1]
): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    v(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
    v(...s)
  );
  g.applyMatrix4(m);
  return g;
}

function merged(list: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    // Keep only the attributes every primitive shares so they can merge.
    for (const name of Object.keys(n.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) n.deleteAttribute(name);
    }
    return n;
  });
  const out = mergeGeometries(flat, false);
  if (!out) throw new Error('Could not merge bike geometry.');
  return out;
}

function tube(
  pts: readonly (readonly [number, number, number])[],
  r: number,
  opts: { closed?: boolean; seg?: number; radial?: number } = {}
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => v(...p)), opts.closed ?? false, 'centripetal');
  return new THREE.TubeGeometry(curve, opts.seg ?? 96, r, opts.radial ?? 18, opts.closed ?? false);
}

/** A cylinder running from point a to point b. */
function rod(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  r: number,
  r2: number = r,
  radial = 24
): THREE.BufferGeometry {
  const va = v(...a);
  const vb = v(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r2, r, len, radial, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), dir.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, v(1, 1, 1)));
  return g;
}

function extrude(shape: THREE.Shape, depth: number, bevel = 0, steps = 1): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: bevel > 0 ? 7 : 0,
    curveSegments: 56,
    steps,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

function lathe(profile: readonly (readonly [number, number])[], seg = 96): THREE.BufferGeometry {
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), seg);
}

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function gearShape(rOuter: number, rRoot: number, teeth: number, hole: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / teeth;
    const pts: [number, number][] = [
      [rRoot, a0],
      [rOuter, a0 + (a1 - a0) * 0.22],
      [rOuter, a0 + (a1 - a0) * 0.5],
      [rRoot, a0 + (a1 - a0) * 0.72],
    ];
    pts.forEach(([r, a], k) => {
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0 && k === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  s.holes.push(h);
  return s;
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly turns: number,
    private readonly radius: number,
    private readonly length: number
  ) {
    super();
  }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * this.radius, t * this.length, Math.sin(a) * this.radius);
  }
}

/** Orient a geometry built along +y so it runs from a to b. */
function alongY(g: THREE.BufferGeometry, a: readonly [number, number, number], b: readonly [number, number, number]) {
  const va = v(...a);
  const dir = v(...b).sub(va);
  const q = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), dir.clone().normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(va, q, v(1, 1, 1)));
  return g;
}

/** A wheel in its own frame: axle at the origin, running along z. */
function wheel(side: 'front' | 'rear'): PartDef[] {
  const group = side;
  const parts: PartDef[] = [];

  const tire = lathe(
    [
      [0.222, -0.05],
      [0.25, -0.07],
      [0.285, -0.082],
      [0.315, -0.074],
      [0.331, -0.048],
      [0.336, -0.016],
      [0.336, 0.016],
      [0.331, 0.048],
      [0.315, 0.074],
      [0.285, 0.082],
      [0.25, 0.07],
      [0.222, 0.05],
    ],
    128
  ).rotateX(Math.PI / 2);
  parts.push({ id: `${side}-tyre`, geo: tire, mat: 'rubber', edge: false, group });

  // Tread blocks stand proud of the crown so the tyre reads as a tyre, not a donut.
  const blocks: THREE.BufferGeometry[] = [];
  const count = 72;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const b = new THREE.BoxGeometry(0.014, 0.012, 0.1);
    place(b, [Math.cos(a) * 0.3405, Math.sin(a) * 0.3405, 0], [0, 0, a + (i % 2 ? 0.08 : -0.08)]);
    blocks.push(b);
  }
  parts.push({ id: `${side}-tread`, geo: merged(blocks), mat: 'rubber', edge: false, group });

  const rim = lathe(
    [
      [0.186, -0.05],
      [0.226, -0.052],
      [0.232, -0.044],
      [0.206, -0.034],
      [0.202, 0],
      [0.206, 0.034],
      [0.232, 0.044],
      [0.226, 0.052],
      [0.186, 0.05],
      [0.186, -0.05],
    ],
    128
  ).rotateX(Math.PI / 2);
  parts.push({ id: `${side}-rim`, geo: rim, mat: 'alloy', edge: 35, group });

  const spokeShape = new THREE.Shape();
  spokeShape.moveTo(0.05, -0.024);
  spokeShape.lineTo(0.186, -0.011);
  spokeShape.lineTo(0.186, 0.011);
  spokeShape.lineTo(0.05, 0.024);
  spokeShape.closePath();
  const spokes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const s = extrude(spokeShape, 0.024, 0.004);
    place(s, [0, 0, i % 2 ? 0.012 : -0.012], [0, 0, (i / 10) * Math.PI * 2]);
    spokes.push(s);
  }
  parts.push({ id: `${side}-spokes`, geo: merged(spokes), mat: 'alloy', edge: 30, group });

  const hub = merged([
    place(new THREE.CylinderGeometry(0.052, 0.052, 0.13, 40), [0, 0, 0], [Math.PI / 2, 0, 0]),
    place(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 32), [0, 0, 0], [Math.PI / 2, 0, 0]),
  ]);
  parts.push({ id: `${side}-hub`, geo: hub, mat: 'gold', edge: 30, group });

  // Drilled brake disc(s).
  const discShape = new THREE.Shape();
  discShape.absarc(0, 0, 0.138, 0, Math.PI * 2, false);
  const inner = new THREE.Path();
  inner.absarc(0, 0, 0.064, 0, Math.PI * 2, true);
  discShape.holes.push(inner);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * 0.101, Math.sin(a) * 0.101, 0.0085, 0, Math.PI * 2, true);
    discShape.holes.push(h);
  }
  const discZ = side === 'front' ? [0.05, -0.05] : [0.05];
  parts.push({
    id: `${side}-disc`,
    geo: merged(discZ.map((z) => place(extrude(discShape, 0.006), [0, 0, z]))),
    mat: 'steel',
    edge: 30,
    group,
  });

  if (side === 'rear') {
    const sprocket = place(extrude(gearShape(0.112, 0.101, 40, 0.07), 0.008), [0, 0, -0.065]);
    parts.push({ id: 'rear-sprocket', geo: sprocket, mat: 'steel', edge: 30, group });
  }
  return parts;
}

export interface BikeModel {
  readonly parts: readonly PartDef[];
  readonly bounds: { readonly length: number; readonly height: number; readonly wheelbase: number };
}

let cache: BikeModel | null = null;

export function buildBike(): BikeModel {
  if (cache) return cache;
  const parts: PartDef[] = [];
  const add = (id: string, geo: THREE.BufferGeometry, mat: MatKey, edge: number | false = 32) =>
    parts.push({ id, geo, mat, edge });

  parts.push(...wheel('front'), ...wheel('rear'));

  // ---- Frame: a twin-spar trellis with a curved cradle, in smooth tubes ----
  const frameSides = [1, -1] as const;
  const frame: THREE.BufferGeometry[] = [];
  for (const z of frameSides) {
    frame.push(
      tube([[0.47, 0.92, 0.035 * z], [0.3, 0.97, 0.1 * z], [0.0, 0.93, 0.115 * z], [-0.3, 0.88, 0.115 * z], [-0.62, 0.87, 0.105 * z]], 0.02),
      tube([[0.45, 0.86, 0.04 * z], [0.32, 0.6, 0.085 * z], [0.14, 0.34, 0.11 * z], [-0.06, 0.26, 0.115 * z], [-0.28, 0.32, 0.115 * z], [-0.37, 0.52, 0.115 * z], [-0.34, 0.84, 0.115 * z]], 0.019),
      tube([[-0.34, 0.84, 0.115 * z], [-0.5, 0.66, 0.108 * z], [-0.62, 0.86, 0.105 * z]], 0.014),
      tube([[0.3, 0.97, 0.1 * z], [0.22, 0.7, 0.1 * z], [0.1, 0.42, 0.112 * z]], 0.014)
    );
  }
  frame.push(
    place(new THREE.CylinderGeometry(0.043, 0.043, 0.2, 32), [0.49, 0.92, 0], [0, 0, 0.27]),
    rod([-0.36, 0.55, -0.115], [-0.36, 0.55, 0.115], 0.016),
    rod([-0.34, 0.84, -0.115], [-0.34, 0.84, 0.115], 0.014),
    rod([0.12, 0.34, -0.11], [0.12, 0.34, 0.11], 0.014)
  );
  add('frame', merged(frame), 'frame', false);

  // ---- Swingarm (box section look, braced) ----
  const swing: THREE.BufferGeometry[] = [];
  for (const z of frameSides) {
    swing.push(rod([-0.34, 0.4, 0.118 * z], [REAR_AXLE.x, REAR_AXLE.y, 0.108 * z], 0.026, 0.02, 20));
  }
  swing.push(rod([-0.34, 0.4, -0.12], [-0.34, 0.4, 0.12], 0.02), rod([-0.5, 0.375, -0.115], [-0.5, 0.375, 0.115], 0.016));
  add('swingarm', merged(swing), 'steel', 35);

  // ---- Front fork ----
  const forkTop: [number, number, number] = [0.52, 1.0, 0];
  const fork: THREE.BufferGeometry[] = [];
  const forkLowers: THREE.BufferGeometry[] = [];
  for (const z of frameSides) {
    const top: [number, number, number] = [forkTop[0], forkTop[1], 0.105 * z];
    const axle: [number, number, number] = [FRONT_AXLE.x, FRONT_AXLE.y, 0.105 * z];
    const mid: [number, number, number] = [top[0] + (axle[0] - top[0]) * 0.52, top[1] + (axle[1] - top[1]) * 0.52, top[2]];
    fork.push(rod(top, mid, 0.017, 0.017, 24));
    forkLowers.push(rod(mid, axle, 0.024, 0.021, 24), place(new THREE.CylinderGeometry(0.03, 0.03, 0.045, 24), axle, [Math.PI / 2, 0, 0]));
  }
  add('fork-stanchions', merged(fork), 'chrome', 40);
  add('fork-lowers', merged(forkLowers), 'gold', 35);

  const yokes = merged([
    place(extrude(roundedRect(0.1, 0.06, 0.02), 0.27, 0.012), [0.53, 0.99, 0]),
    place(extrude(roundedRect(0.09, 0.05, 0.018), 0.26, 0.01), [0.5, 0.88, 0]),
  ]);
  add('triple-clamp', yokes, 'alloy', 30);

  // ---- Bars, grips, levers, mirrors ----
  const bars = merged([
    tube([[0.5, 1.07, -0.4], [0.53, 1.08, -0.26], [0.55, 1.07, -0.1], [0.55, 1.07, 0.1], [0.53, 1.08, 0.26], [0.5, 1.07, 0.4]], 0.0115, { seg: 80, radial: 14 }),
  ]);
  add('handlebar', bars, 'chrome', false);
  add('grips', merged([rod([0.5, 1.07, 0.3], [0.5, 1.07, 0.42], 0.0185, 0.0185, 24), rod([0.5, 1.07, -0.3], [0.5, 1.07, -0.42], 0.0185, 0.0185, 24)]), 'rubber', 40);
  add(
    'levers',
    merged([
      tube([[0.52, 1.075, 0.3], [0.58, 1.07, 0.37], [0.64, 1.065, 0.41]], 0.006, { seg: 24, radial: 8 }),
      tube([[0.52, 1.075, -0.3], [0.57, 1.068, -0.37], [0.62, 1.062, -0.4]], 0.006, { seg: 24, radial: 8 }),
    ]),
    'steel',
    false
  );
  const mirrors: THREE.BufferGeometry[] = [];
  for (const z of frameSides) {
    mirrors.push(
      tube([[0.52, 1.08, 0.31 * z], [0.5, 1.2, 0.34 * z], [0.47, 1.26, 0.36 * z]], 0.005, { seg: 24, radial: 8 }),
      place(new THREE.SphereGeometry(0.055, 28, 20), [0.46, 1.285, 0.37 * z], [0, 0, 0], [0.32, 0.7, 1])
    );
  }
  add('mirrors', merged(mirrors), 'black', false);

  // ---- Headlight, cluster, indicators ----
  const bowl = lathe([[0, 0], [0.075, 0.005], [0.108, 0.045], [0.118, 0.1], [0.106, 0.142], [0.1, 0.15]], 64).rotateZ(-Math.PI / 2);
  add('headlight-bowl', place(bowl, [0.5, 0.97, 0]), 'chrome', false);
  add('headlight-lens', place(new THREE.SphereGeometry(0.1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2.4), [0.645, 0.97, 0], [0, 0, -Math.PI / 2], [1, 1, 1]), 'lens', false);
  add('headlight-ring', place(new THREE.TorusGeometry(0.101, 0.008, 16, 64), [0.652, 0.97, 0], [0, Math.PI / 2, 0]), 'gold', false);
  add(
    'cluster',
    merged([
      place(extrude(roundedRect(0.11, 0.09, 0.025), 0.07, 0.01), [0.4, 1.085, 0], [0, 0, -0.5]),
    ]),
    'black',
    30
  );
  add('cluster-glass', place(new THREE.CircleGeometry(0.036, 40), [0.4465, 1.0935, 0.0], [0, Math.PI / 2, 0.4]), 'lens', false);
  add(
    'indicators',
    merged([
      place(new THREE.SphereGeometry(0.025, 20, 14), [0.58, 0.9, 0.2]),
      place(new THREE.SphereGeometry(0.025, 20, 14), [0.58, 0.9, -0.2]),
      place(new THREE.SphereGeometry(0.025, 20, 14), [-0.9, 0.84, 0.13]),
      place(new THREE.SphereGeometry(0.025, 20, 14), [-0.9, 0.84, -0.13]),
    ]),
    'amber',
    false
  );

  // ---- Bodywork ----
  const tank = new THREE.Shape();
  tank.moveTo(0.42, 0.9);
  tank.bezierCurveTo(0.4, 0.99, 0.28, 1.05, 0.1, 1.05);
  tank.bezierCurveTo(-0.03, 1.05, -0.1, 1.02, -0.13, 0.96);
  tank.bezierCurveTo(-0.14, 0.9, -0.08, 0.84, 0.1, 0.82);
  tank.bezierCurveTo(0.3, 0.8, 0.44, 0.84, 0.42, 0.9);
  add('tank', extrude(tank, 0.2, 0.07), 'paint', 22);
  add('tank-cap', place(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 40), [0.13, 1.135, 0]), 'gold', 30);
  add('tank-stripe', place(new THREE.BoxGeometry(0.46, 0.004, 0.012), [0.14, 1.123, 0]), 'gold', false);

  const seat = new THREE.Shape();
  seat.moveTo(-0.12, 0.955);
  seat.bezierCurveTo(-0.3, 0.985, -0.5, 0.985, -0.66, 0.945);
  seat.lineTo(-0.66, 0.9);
  seat.lineTo(-0.12, 0.9);
  seat.closePath();
  add('seat', extrude(seat, 0.2, 0.035), 'leather', 25);

  const tail = new THREE.Shape();
  tail.moveTo(-0.58, 0.945);
  tail.bezierCurveTo(-0.72, 0.965, -0.86, 0.94, -0.97, 0.9);
  tail.lineTo(-0.97, 0.86);
  tail.lineTo(-0.58, 0.87);
  tail.closePath();
  add('tail-cowl', extrude(tail, 0.13, 0.03), 'paint', 22);
  add('tail-lamp', place(new THREE.BoxGeometry(0.02, 0.035, 0.1), [-1.005, 0.89, 0]), 'tail', false);

  const frontFender = new THREE.Shape();
  frontFender.absarc(0, 0, 0.378, 0.28, 2.05, false);
  frontFender.absarc(0, 0, 0.362, 2.05, 0.28, true);
  add('front-fender', place(extrude(frontFender, 0.13, 0.006), [FRONT_AXLE.x, FRONT_AXLE.y, 0]), 'paint', 25);
  const rearHugger = new THREE.Shape();
  rearHugger.absarc(0, 0, 0.372, 1.1, 2.9, false);
  rearHugger.absarc(0, 0, 0.358, 2.9, 1.1, true);
  add('rear-hugger', place(extrude(rearHugger, 0.12, 0.005), [REAR_AXLE.x, REAR_AXLE.y, 0]), 'black', 25);

  // ---- Engine ----
  const engine: THREE.BufferGeometry[] = [
    place(extrude(roundedRect(0.34, 0.25, 0.07), 0.22, 0.02), [0.02, 0.4, 0]),
    place(extrude(roundedRect(0.16, 0.17, 0.05), 0.24, 0.012), [-0.13, 0.35, 0]),
  ];
  const fins: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    fins.push(place(new THREE.BoxGeometry(0.2, 0.011, 0.19), [0.15 + i * 0.012, 0.53 + i * 0.029, 0], [0, 0, -0.34]));
  }
  add('engine-case', merged(engine), 'alloy', 30);
  add('engine-fins', merged(fins), 'black', 30);
  add('engine-head', place(extrude(roundedRect(0.2, 0.09, 0.03), 0.2, 0.012), [0.22, 0.79, 0], [0, 0, -0.34]), 'gold', 30);
  add('engine-cover', place(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 40), [0.0, 0.4, 0.125], [Math.PI / 2, 0, 0]), 'gold', 30);

  // ---- Exhaust ----
  const exhaust = merged([
    tube([[0.27, 0.74, 0.06], [0.38, 0.6, 0.09], [0.3, 0.38, 0.13], [0.08, 0.26, 0.16], [-0.2, 0.27, 0.17], [-0.4, 0.28, 0.17]], 0.027, { seg: 120, radial: 20 }),
  ]);
  add('exhaust-pipe', exhaust, 'chrome', false);
  const muffler = lathe([[0, -0.24], [0.03, -0.245], [0.06, -0.22], [0.062, 0.2], [0.05, 0.238], [0, 0.245]], 72).rotateZ(Math.PI / 2);
  add('muffler', place(muffler, [-0.65, 0.3, 0.17], [0, 0, 0.05]), 'chrome', 40);
  add('muffler-tip', place(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 32), [-0.905, 0.31, 0.17], [0, 0, Math.PI / 2 + 0.05]), 'black', 30);

  // ---- Rear suspension: coil-over shocks ----
  const springs: THREE.BufferGeometry[] = [];
  const shocks: THREE.BufferGeometry[] = [];
  for (const z of frameSides) {
    const top: [number, number, number] = [-0.5, 0.84, 0.125 * z];
    const bottom: [number, number, number] = [-0.5 + 0.06, 0.42, 0.122 * z];
    const len = v(...top).distanceTo(v(...bottom));
    springs.push(alongY(new THREE.TubeGeometry(new Helix(10, 0.033, len * 0.8), 260, 0.0048, 8), [bottom[0], bottom[1], bottom[2]], [top[0], top[1], top[2]]));
    shocks.push(rod(bottom, top, 0.012, 0.012, 16), rod(bottom, [bottom[0] + (top[0] - bottom[0]) * 0.28, bottom[1] + (top[1] - bottom[1]) * 0.28, bottom[2]], 0.02, 0.02, 20));
  }
  add('springs', merged(springs), 'gold', false);
  add('shocks', merged(shocks), 'steel', 35);

  // ---- Chain and front sprocket ----
  add('chain', tube([[-0.18, 0.41, -0.065], [-0.43, 0.405, -0.065], [-0.68, 0.45, -0.065], [-0.79, 0.336, -0.065], [-0.68, 0.222, -0.065], [-0.43, 0.275, -0.065], [-0.18, 0.31, -0.065], [-0.11, 0.36, -0.065]].map((p) => p as [number, number, number]), 0.009, { closed: true, seg: 160, radial: 8 }), 'black', false);
  add('front-sprocket', place(extrude(gearShape(0.052, 0.044, 14, 0.015), 0.01), [-0.15, 0.36, -0.065]), 'steel', 30);

  // ---- Rider controls ----
  const pegs: THREE.BufferGeometry[] = [];
  for (const z of frameSides) {
    pegs.push(rod([-0.05, 0.31, 0.13 * z], [-0.05, 0.31, 0.25 * z], 0.012, 0.012, 14), rod([0.0, 0.31, 0.13 * z], [0.0, 0.36, 0.13 * z], 0.01, 0.01, 12));
  }
  add('footpegs', merged(pegs), 'steel', 35);
  add('side-stand', merged([rod([-0.08, 0.3, -0.14], [-0.04, 0.05, -0.28], 0.012, 0.012, 12), rod([-0.04, 0.05, -0.28], [-0.1, 0.05, -0.28], 0.016, 0.016, 12)]), 'black', 35);

  // Bounds, from the actual geometry.
  const box = new THREE.Box3();
  for (const p of parts) {
    p.geo.computeBoundingBox();
    const b = p.geo.boundingBox!.clone();
    if (p.group) b.translate(p.group === 'front' ? FRONT_AXLE : REAR_AXLE);
    box.union(b);
  }
  cache = {
    parts,
    bounds: {
      length: Math.round((box.max.x - box.min.x) * 100) / 100,
      height: Math.round((box.max.y - box.min.y) * 100) / 100,
      wheelbase: Math.round((FRONT_AXLE.x - REAR_AXLE.x) * 100) / 100,
    },
  };
  return cache;
}
