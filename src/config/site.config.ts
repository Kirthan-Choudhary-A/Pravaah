export interface NavRoute {
  readonly path: string;
  readonly label: string;
  readonly group: 'Workspace' | 'People and vehicles' | 'Evidence' | 'About';
}

export const SITE_CONFIG = {
  name: 'Pravaah',
  tagline: 'Vehicle & Driving Services Made Simple',
  challenge: 'IMPACTX 2026 — Challenge 09',
  simulatedNotice: 'Prototype on simulated data. Not affiliated with MoRTH or Parivahan.',
  routes: [
    { path: '/', label: 'Dashboard', group: 'Workspace' },
    { path: '/plan', label: 'Plan', group: 'Workspace' },
    { path: '/simulate', label: 'Simulate', group: 'Workspace' },
    { path: '/household', label: 'Household', group: 'People and vehicles' },
    { path: '/voice', label: 'Plate entry', group: 'People and vehicles' },
    { path: '/sources', label: 'Sources', group: 'Evidence' },
    { path: '/metrics', label: 'Metrics', group: 'Evidence' },
    { path: '/overview', label: 'About Pravaah', group: 'About' },
  ] as const satisfies readonly NavRoute[],
} as const;
