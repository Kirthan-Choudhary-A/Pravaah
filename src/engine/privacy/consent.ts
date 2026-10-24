/**
 * Pure Consent State Machine
 *
 * States:
 * none -> pending -> granted | declined
 * granted -> revoked | expired
 *
 * Rules:
 * - Deterministic, pure functions with no Date.now() or Math.random().
 * - Expiry evaluated against explicit `now` argument.
 * - Invalid transitions return an error result; never throw silently.
 */

import type {
  Consent,
  ConsentScope,
  ConsentStatus,
  TransitionResult,
  AuditEntry,
} from '../model/types';

export function createConsentRequest(params: {
  readonly id: string;
  readonly grantorRole: string;
  readonly granteeRole: string;
  readonly vehicleIds: readonly string[];
  readonly scopes: readonly ConsentScope[];
  readonly until: number;
  readonly now: number;
}): TransitionResult {
  const { id, grantorRole, granteeRole, vehicleIds, scopes, until, now } = params;

  if (until <= now) {
    return {
      ok: false,
      error: `Consent expiry 'until' (${until}) must be in the future relative to 'now' (${now}).`,
    };
  }

  if (scopes.length === 0) {
    return {
      ok: false,
      error: 'At least one consent scope must be requested.',
    };
  }

  const consent: Consent = {
    id,
    grantorRole,
    granteeRole,
    vehicleIds,
    scopes,
    until,
    status: 'pending',
  };

  const auditEntry: AuditEntry = {
    id: `audit-${id}-request`,
    at: now,
    actor: granteeRole,
    subject: grantorRole,
    field: 'consent',
    action: 'request',
    purpose: `Request delegation for ${vehicleIds.join(', ')} with scopes [${scopes.join(', ')}]`,
    result: 'completed',
  };

  return { ok: true, consent, auditEntry };
}

export function grantConsent(
  consent: Consent,
  now: number,
  updatedScopes?: readonly ConsentScope[],
  updatedUntil?: number
): TransitionResult {
  const effectiveStatus = evaluateConsentStatus(consent, now);

  if (effectiveStatus !== 'pending') {
    return {
      ok: false,
      error: `Cannot grant consent: current status is '${effectiveStatus}'. Only 'pending' requests can be granted.`,
    };
  }

  const until = updatedUntil ?? consent.until;
  if (until <= now) {
    return {
      ok: false,
      error: `Cannot grant consent with past or immediate expiry 'until' (${until} <= ${now}).`,
    };
  }

  const scopes = updatedScopes ?? consent.scopes;
  if (scopes.length === 0) {
    return {
      ok: false,
      error: 'Cannot grant consent without at least one scope.',
    };
  }

  const grantedConsent: Consent = {
    ...consent,
    scopes,
    until,
    status: 'granted',
  };

  const auditEntry: AuditEntry = {
    id: `audit-${consent.id}-grant`,
    at: now,
    actor: consent.grantorRole,
    subject: consent.granteeRole,
    field: 'consent',
    action: 'grant',
    purpose: `Granted scopes [${scopes.join(', ')}] until ${until}`,
    result: 'allowed',
  };

  return { ok: true, consent: grantedConsent, auditEntry };
}

export function declineConsent(consent: Consent, now: number): TransitionResult {
  const effectiveStatus = evaluateConsentStatus(consent, now);

  if (effectiveStatus !== 'pending') {
    return {
      ok: false,
      error: `Cannot decline consent: current status is '${effectiveStatus}'. Only 'pending' requests can be declined.`,
    };
  }

  const declinedConsent: Consent = {
    ...consent,
    status: 'declined',
  };

  const auditEntry: AuditEntry = {
    id: `audit-${consent.id}-decline`,
    at: now,
    actor: consent.grantorRole,
    subject: consent.granteeRole,
    field: 'consent',
    action: 'decline',
    purpose: 'Delegation request declined by owner',
    result: 'denied',
  };

  return { ok: true, consent: declinedConsent, auditEntry };
}

export function revokeConsent(consent: Consent, now: number): TransitionResult {
  const effectiveStatus = evaluateConsentStatus(consent, now);

  if (effectiveStatus !== 'granted') {
    return {
      ok: false,
      error: `Cannot revoke consent: current status is '${effectiveStatus}'. Only 'granted' consents can be revoked.`,
    };
  }

  const revokedConsent: Consent = {
    ...consent,
    status: 'revoked',
  };

  const auditEntry: AuditEntry = {
    id: `audit-${consent.id}-revoke`,
    at: now,
    actor: consent.grantorRole,
    subject: consent.granteeRole,
    field: 'consent',
    action: 'revoke',
    purpose: 'Active delegation revoked by owner',
    result: 'completed',
  };

  return { ok: true, consent: revokedConsent, auditEntry };
}

/**
 * Pure evaluation of consent status against current point in time `now`.
 */
export function evaluateConsentStatus(consent: Consent, now: number): ConsentStatus {
  if (consent.status === 'granted' && consent.until < now) {
    return 'expired';
  }
  return consent.status;
}
