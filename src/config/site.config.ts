export interface NavRoute {
  readonly path: string;
  readonly label: string;
  readonly group: 'Services' | 'For reviewers';
}

export const SITE_CONFIG = {
  name: 'Pravaah',
  tagline: 'Vehicle & Driving Services Made Simple',
  challenge: 'IMPACTX 2026 — Challenge 09',
  simulatedNotice: 'Prototype on simulated data. Not affiliated with MoRTH or Parivahan.',
  routes: [
    { path: '/', label: 'Dashboard', group: 'Services' },
    { path: '/plan', label: 'My plan', group: 'Services' },
    { path: '/simulate', label: 'What if', group: 'Services' },
    { path: '/household', label: 'Family vehicles', group: 'Services' },
    { path: '/voice', label: 'Enter plate', group: 'Services' },
    { path: '/sources', label: 'Official sources', group: 'Services' },
    { path: '/metrics', label: 'Metrics', group: 'For reviewers' },
    { path: '/overview', label: 'About Pravaah', group: 'For reviewers' },
  ] as const satisfies readonly NavRoute[],
} as const;
