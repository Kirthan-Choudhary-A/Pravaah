import { describe, it, expect } from 'vitest';
import { canAccess } from '../../src/engine/privacy/fieldAccess';
import { reveal, validatePurpose } from '../../src/engine/privacy/reveal';
import { appendAudit } from '../../src/engine/privacy/audit';
import { planHousehold } from '../../src/engine/privacy/planHousehold';
import type { Consent, HouseholdVehicle } from '../../src/engine/model/types';

// Privacy clocks are epoch seconds: `now`, `consent.until` and reveal durations share one unit.
const NOW = 1_800_000_000;

const consentFor = (vehicleIds: string[], overrides: Partial<Consent> = {}): Consent => ({
  id: 'c1',
  grantorRole: 'Family member',
  granteeRole: 'You',
  vehicleIds,
  scopes: ['view'],
  until: NOW + 1000,
  status: 'granted',
  ...overrides,
});

const vehicle = (id: string, plate: string): HouseholdVehicle => ({
  id,
  plate,
  vehicleType: 'Car',
  ownerRole: 'Family member',
  renewalItems: [
    {
      id: `${id}-puc`,
      name: 'PUC Renewal',
      dueDate: 30,
      duration: 1,
      basis: 'modelled',
      verified: false,
      why: 'test',
    },
  ],
});

describe('Privacy: consent covers only its own vehicles', () => {
  it('denies a field on a vehicle the consent does not name', () => {
    const c = consentFor(['veh-a']);
    expect(canAccess('vehicle.chassis', c, NOW, ['veh-a', 'KA-01-AA-0001'])).toBe(true);
    expect(canAccess('vehicle.chassis', c, NOW, ['veh-b', 'KA-01-BB-0002'])).toBe(false);
  });

  it('blocks reveal on another vehicle and allows it on the covered one', () => {
    const c = consentFor(['veh-a']);
    const base = {
      field: 'vehicle.chassis',
      purpose: 'Verify with RTO',
      actor: 'You',
      consent: c,
      rawValue: 'DEMO-CHAS-1',
      now: NOW,
    };
    expect(reveal({ ...base, vehicleKeys: ['veh-b'] }).ok).toBe(false);
    expect(reveal({ ...base, vehicleKeys: ['veh-a'] }).ok).toBe(true);
  });

  it('never reveals Aadhaar, licence or challans even with a granted consent', () => {
    const c = consentFor(['veh-a'], { scopes: ['view', 'apply'] });
    for (const field of ['aadhaar', 'dl', 'challans', 'owner.aadhaar']) {
      expect(canAccess(field, c, NOW, ['veh-a'])).toBe(false);
    }
  });
});

describe('Privacy: reveal lifetime and purpose', () => {
  it('expires a 60 second reveal 60 seconds later, in the same unit as now', () => {
    const res = reveal({
      field: 'vehicle.chassis',
      purpose: 'Pay e-challan',
      actor: 'You',
      consent: consentFor(['veh-a']),
      rawValue: 'X',
      now: NOW,
      vehicleKeys: ['veh-a'],
    });
    expect(res.ok && res.expiresAt).toBe(NOW + 60);
  });

  it('accepts the fixed purposes and Other with a justification, rejects bare free text', () => {
    expect(validatePurpose('Submit NOC application').valid).toBe(true);
    expect(validatePurpose('Other: updating registration paperwork').valid).toBe(true);
    expect(validatePurpose('because I want to see it').valid).toBe(false);
    expect(validatePurpose('Other: short').valid).toBe(false);
  });
});

describe('Privacy: audit log', () => {
  it('keeps ids unique when two entries share a field and instant', () => {
    const entry = {
      id: 'audit-reveal-vehicle.chassis-1',
      at: NOW,
      actor: 'You',
      subject: 'Family member',
      field: 'vehicle.chassis',
      action: 'reveal' as const,
      purpose: 'Verify with RTO',
      result: 'allowed' as const,
    };
    const log = appendAudit(appendAudit([], entry), entry);
    expect(new Set(log.map((e) => e.id)).size).toBe(2);
  });
});

describe('Privacy: household planning respects consent end date and vehicle', () => {
  const vehicles = [vehicle('veh-a', 'KA-01-AA-0001'), vehicle('veh-b', 'KA-01-BB-0002')];

  it('plans only the vehicle the active consent names', () => {
    const tasks = planHousehold({
      householdVehicles: vehicles,
      consents: [consentFor(['veh-a'])],
      now: 0,
      consentNow: NOW,
    });
    expect(tasks.map((t) => t.id)).toEqual(['task-household-veh-a-puc']);
  });

  it('shows nothing once the consent has expired', () => {
    const tasks = planHousehold({
      householdVehicles: vehicles,
      consents: [consentFor(['veh-a', 'veh-b'], { until: NOW - 1 })],
      now: 0,
      consentNow: NOW,
    });
    expect(tasks).toEqual([]);
  });

  it('shows nothing after the consent is revoked, even if an older grant exists', () => {
    const tasks = planHousehold({
      householdVehicles: vehicles,
      consents: [
        consentFor(['veh-a'], { id: 'old', status: 'revoked' }),
        consentFor(['veh-b'], { id: 'new' }),
      ],
      now: 0,
      consentNow: NOW,
    });
    expect(tasks.map((t) => t.id)).toEqual(['task-household-veh-b-puc']);
  });
});
