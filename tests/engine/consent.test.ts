import { describe, it, expect } from 'vitest';
import {
  createConsentRequest,
  grantConsent,
  declineConsent,
  revokeConsent,
  evaluateConsentStatus,
} from '../../src/engine/privacy/consent';
import { canAccess } from '../../src/engine/privacy/fieldAccess';
import { reveal, validatePurpose } from '../../src/engine/privacy/reveal';
import { appendAudit } from '../../src/engine/privacy/audit';
import { planHousehold } from '../../src/engine/privacy/planHousehold';
import type { Consent, HouseholdVehicle, RulePack } from '../../src/engine/model/types';

describe('Privacy Engine: Consent, Field Access, Reveal & Audit', () => {
  const dummyPack: RulePack = {
    stateCode: 'KA',
    version: 'v2026.1',
    licenceStages: {
      renewalWindowDays: 365,
      graceDays: 30,
      drivingAllowedDuringGrace: true,
      lateFee: { base: 1000, perYear: 1000 },
      testAfterDays: 1825,
      verified: false,
      basis: 'statute',
      sourceIds: [],
      note: '',
    },
    reRegistrationLimitDays: { value: 365, basis: 'statute', sourceIds: [], verified: false, note: '' },
    rcAddressIntimationDays: { value: 30, basis: 'statute', sourceIds: [], verified: false, note: '' },
    servicesOnline: {
      licenceRenewal: true,
      licenceAddressChange: true,
      otherServices: [],
      basis: 'statute',
      sourceIds: [],
      verified: false,
      note: '',
    },
    licenceRenewalAtAnyRTO: { value: true, basis: 'statute', sourceIds: [], verified: false, note: '' },
    nocBlockedBy: [],
    nocAddressMustMatchRC: { value: true, basis: 'modelled', note: '' },
    classLetters: { S: 'S', C: 'C' },
    bhSeries: { exemptFromNOC: true, exemptFromReRegistration: true },
    fees: [],
  };

  const sampleVehicle: HouseholdVehicle = {
    id: 'veh-family-1',
    plate: 'KA-03-MJ-4578',
    vehicleType: 'two-wheeler',
    ownerRole: 'Family member',
    aadhaarDemo: 'DEMO-0000-1234',
    dlDemo: 'KA03-2020-0001234',
    renewalItems: [
      {
        id: 'puc-renewal',
        name: 'Pollution Under Control (PUC)',
        dueDate: 30,
        duration: 1,
        basis: 'statute',
        verified: false,
        why: 'Mandatory annual emissions test under Section 190(2).',
      },
    ],
  };

  describe('Consent Transitions', () => {
    it('creates a valid pending consent request', () => {
      const res = createConsentRequest({
        id: 'c-1',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['veh-family-1'],
        scopes: ['view'],
        until: 60,
        now: 0,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.consent.status).toBe('pending');
        expect(res.consent.until).toBe(60);
        expect(res.auditEntry.action).toBe('request');
      }
    });

    it('rejects consent request with past expiry', () => {
      const res = createConsentRequest({
        id: 'c-1',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['veh-family-1'],
        scopes: ['view'],
        until: 0,
        now: 10,
      });

      expect(res.ok).toBe(false);
    });

    it('grants a pending consent with audit log', () => {
      const req = createConsentRequest({
        id: 'c-1',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['veh-family-1'],
        scopes: ['view'],
        until: 60,
        now: 0,
      });
      expect(req.ok).toBe(true);
      if (!req.ok) return;

      const grant = grantConsent(req.consent, 1);
      expect(grant.ok).toBe(true);
      if (grant.ok) {
        expect(grant.consent.status).toBe('granted');
        expect(grant.auditEntry.action).toBe('grant');
      }
    });

    it('declines a pending consent with audit log', () => {
      const req = createConsentRequest({
        id: 'c-1',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['veh-family-1'],
        scopes: ['view'],
        until: 60,
        now: 0,
      });
      if (!req.ok) return;

      const dec = declineConsent(req.consent, 1);
      expect(dec.ok).toBe(true);
      if (dec.ok) {
        expect(dec.consent.status).toBe('declined');
        expect(dec.auditEntry.action).toBe('decline');
      }
    });

    it('revokes an active granted consent', () => {
      const req = createConsentRequest({
        id: 'c-1',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['veh-family-1'],
        scopes: ['view', 'apply'],
        until: 60,
        now: 0,
      });
      if (!req.ok) return;
      const granted = grantConsent(req.consent, 1);
      if (!granted.ok) return;

      const rev = revokeConsent(granted.consent, 5);
      expect(rev.ok).toBe(true);
      if (rev.ok) {
        expect(rev.consent.status).toBe('revoked');
        expect(rev.auditEntry.action).toBe('revoke');
      }
    });

    it('returns error on invalid transitions without throwing', () => {
      const invalidConsent: Consent = {
        id: 'c-inv',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['v-1'],
        scopes: ['view'],
        until: 60,
        status: 'declined',
      };

      // Cannot grant a declined consent
      const res = grantConsent(invalidConsent, 5);
      expect(res.ok).toBe(false);

      // Cannot revoke a declined consent
      const rev = revokeConsent(invalidConsent, 5);
      expect(rev.ok).toBe(false);
    });

    it('evaluates expiry strictly against `now`', () => {
      const consent: Consent = {
        id: 'c-exp',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['v-1'],
        scopes: ['view'],
        until: 30,
        status: 'granted',
      };

      expect(evaluateConsentStatus(consent, 25)).toBe('granted');
      expect(evaluateConsentStatus(consent, 30)).toBe('granted');
      expect(evaluateConsentStatus(consent, 31)).toBe('expired');
    });
  });

  describe('Field Access Boundaries', () => {
    const grantedViewConsent: Consent = {
      id: 'c-view',
      grantorRole: 'Family member',
      granteeRole: 'You',
      vehicleIds: ['veh-family-1'],
      scopes: ['view'],
      until: 60,
      status: 'granted',
    };

    const grantedApplyConsent: Consent = {
      id: 'c-apply',
      grantorRole: 'Family member',
      granteeRole: 'You',
      vehicleIds: ['veh-family-1'],
      scopes: ['view', 'apply'],
      until: 60,
      status: 'granted',
    };

    const grantedRegisterConsent: Consent = {
      id: 'c-reg',
      grantorRole: 'Family member',
      granteeRole: 'You',
      vehicleIds: [],
      scopes: ['register_new'],
      until: 60,
      status: 'granted',
    };

    it('allows viewing tasks and due dates under view scope', () => {
      expect(canAccess('vehicle.tasks', grantedViewConsent, 0)).toBe(true);
      expect(canAccess('vehicle.dueDate', grantedViewConsent, 0)).toBe(true);
      expect(canAccess('vehicle.lsd', grantedViewConsent, 0)).toBe(true);
      expect(canAccess('vehicle.status', grantedViewConsent, 0)).toBe(true);
    });

    it('denies application actions under view scope, allows under apply scope', () => {
      expect(canAccess('vehicle.apply', grantedViewConsent, 0)).toBe(false);
      expect(canAccess('vehicle.apply', grantedApplyConsent, 0)).toBe(true);
    });

    it('allows new registration under register_new scope only', () => {
      expect(canAccess('vehicle.register_new', grantedViewConsent, 0)).toBe(false);
      expect(canAccess('vehicle.register_new', grantedRegisterConsent, 0)).toBe(true);
    });

    it('ALWAYS hides Aadhaar, DL, and Challans regardless of scopes', () => {
      const superConsent: Consent = {
        id: 'c-super',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['veh-family-1'],
        scopes: ['view', 'apply', 'register_new'],
        until: 60,
        status: 'granted',
      };

      expect(canAccess('aadhaar', superConsent, 0)).toBe(false);
      expect(canAccess('aadhaarDemo', superConsent, 0)).toBe(false);
      expect(canAccess('dl', superConsent, 0)).toBe(false);
      expect(canAccess('dlDemo', superConsent, 0)).toBe(false);
      expect(canAccess('licence.number', superConsent, 0)).toBe(false);
      expect(canAccess('challans', superConsent, 0)).toBe(false);
      expect(canAccess('challansDemo', superConsent, 0)).toBe(false);
      expect(canAccess('locations', superConsent, 0)).toBe(false);
      expect(canAccess('violationLocations', superConsent, 0)).toBe(false);
    });
  });

  describe('Field Reveal and Audit Invariance', () => {
    const grantedViewConsent: Consent = {
      id: 'c-view',
      grantorRole: 'Family member',
      granteeRole: 'You',
      vehicleIds: ['veh-family-1'],
      scopes: ['view'],
      until: 60,
      status: 'granted',
    };

    it('validates purposes: accepts fixed list and long text, rejects short or empty', () => {
      expect(validatePurpose('Submit NOC application').valid).toBe(true);
      expect(validatePurpose('Pay e-challan').valid).toBe(true);
      expect(validatePurpose('Verify with RTO').valid).toBe(true);
      expect(validatePurpose('Other: verify details for insurance policy renewal').valid).toBe(true);
      expect(validatePurpose('Other: short').valid).toBe(false);
      expect(validatePurpose('').valid).toBe(false);
    });

    it('blocks reveal if purpose is invalid or missing', () => {
      const res = reveal({
        field: 'vehicle.plate',
        purpose: 'short',
        actor: 'You',
        consent: grantedViewConsent,
        rawValue: 'KA-03-MJ-4578',
        now: 0,
      });

      expect(res.ok).toBe(false);
    });

    it('blocks reveal if field is not accessible by actor', () => {
      const res = reveal({
        field: 'aadhaar',
        purpose: 'Verify with RTO',
        actor: 'You',
        consent: grantedViewConsent,
        rawValue: 'DEMO-0000-1234',
        now: 0,
      });

      expect(res.ok).toBe(false);
    });

    it('allows reveal when authorized and records immutable audit entry', () => {
      const res = reveal({
        field: 'vehicle.plate',
        purpose: 'Verify with RTO',
        actor: 'You',
        consent: grantedViewConsent,
        rawValue: 'KA-03-MJ-4578',
        now: 10,
        durationSeconds: 60,
      });

      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe('KA-03-MJ-4578');
        expect(res.expiresAt).toBe(70);
        expect(res.auditEntry.action).toBe('reveal');
        expect(res.auditEntry.result).toBe('allowed');

        // Append to audit log
        const log = [res.auditEntry];
        const updated = appendAudit(log, {
          id: 'audit-2',
          at: 12,
          actor: 'You',
          subject: 'Family member',
          field: 'vehicle.plate',
          action: 'apply',
          result: 'completed',
        });

        expect(updated.length).toBe(2);
        expect(log.length).toBe(1); // Immutability verified
      }
    });
  });

  describe('planHousehold Engine Function', () => {
    it('returns empty list when consent is not granted or expired', () => {
      const tasks = planHousehold(sampleVehicle, dummyPack, null, 0);
      expect(tasks).toEqual([]);

      const expiredConsent: Consent = {
        id: 'c-exp',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['veh-family-1'],
        scopes: ['view'],
        until: 10,
        status: 'granted',
      };
      const expTasks = planHousehold(sampleVehicle, dummyPack, expiredConsent, 20);
      expect(expTasks).toEqual([]);
    });

    it('schedules household tasks in the household lane with LSD and status', () => {
      const consent: Consent = {
        id: 'c-valid',
        grantorRole: 'Family member',
        granteeRole: 'You',
        vehicleIds: ['veh-family-1'],
        scopes: ['view'],
        until: 60,
        status: 'granted',
      };

      const tasks = planHousehold(sampleVehicle, dummyPack, consent, 0);
      expect(tasks.length).toBe(1);

      const puc = tasks[0]!;
      expect(puc.lane).toBe('household');
      expect(puc.deadline).toBe(30);
      expect(puc.duration).toBe(1);
      expect(puc.start).toBe(23); // 30 - 7 = Day 23
      expect(puc.end).toBe(24);
      expect(puc.lsd).toBe(29); // 30 - 1 = Day 29
      expect(puc.slack).toBe(6); // 29 - 23 = 6
      expect(puc.status).toBe('Safe');
    });
  });
});
