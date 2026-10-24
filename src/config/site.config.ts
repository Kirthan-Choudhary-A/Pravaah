export interface NavRoute {
  readonly path: string;
  readonly label: string;
}

export const SITE_CONFIG = {
  name: 'Pravaah',
  tagline: 'Vehicle & Driving Services Made Simple',
  challenge: 'IMPACTX 2026 — Challenge 09',
  simulatedNotice: 'Prototype on simulated data. Not affiliated with MoRTH or Parivahan.',
  routes: [
    { path: '/', label: 'Story' },
    { path: '/plan', label: 'Plan' },
    { path: '/simulate', label: 'Simulate' },
    { path: '/household', label: 'Household' },
    { path: '/voice', label: 'Voice' },
    { path: '/sources', label: 'Sources' },
    { path: '/metrics', label: 'Metrics' },
  ] as const satisfies readonly NavRoute[],
} as const;
