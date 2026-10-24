/**
 * Pure Time-Limited Field Reveal Helper
 *
 * Rules:
 * - Purpose must be from a fixed list:
 *   "Submit NOC application", "Pay e-challan", "Verify with RTO", or "Other: <at least 10 characters>".
 *   Bare free text is rejected.
 * - Allowed only when actor may access that field.
 * - Returns a time-limited reveal (60 seconds default) plus an immutable audit entry.
 */

import type { Consent, RevealResult, AuditEntry } from '../model/types';
import { canAccess } from './fieldAccess';

export const VALID_PURPOSES = [
  'Submit NOC application',
  'Pay e-challan',
  'Verify with RTO',
  'Other',
] as const;

export type ValidPurpose = (typeof VALID_PURPOSES)[number];

export function validatePurpose(purpose: string): { readonly valid: boolean; readonly reason?: string } {
  if (!purpose || typeof purpose !== 'string') {
    return { valid: false, reason: 'Purpose must be specified.' };
  }

  const trimmed = purpose.trim();

  // Check exact matches for standard purposes
  if (
    trimmed === 'Submit NOC application' ||
    trimmed === 'Pay e-challan' ||
    trimmed === 'Verify with RTO'
  ) {
    return { valid: true };
  }

  // Check "Other" case with >= 10 characters justification
  if (trimmed.startsWith('Other')) {
    const detail = trimmed.slice(5).trim();
    if (detail.length >= 10) {
      return { valid: true };
    }
    return {
      valid: false,
      reason: "'Other' purpose requires at least 10 characters of detailed justification.",
    };
  }

  return {
    valid: false,
    reason:
      "Purpose must be one of: 'Submit NOC application', 'Pay e-challan', 'Verify with RTO', or 'Other: ' followed by at least 10 characters of justification.",
  };
}

export function reveal(params: {
  readonly field: string;
  readonly purpose: string;
  readonly actor: string;
  readonly subject?: string;
  readonly consent: Consent | null;
  readonly rawValue: string;
  /** Epoch seconds, the same unit as `consent.until` and `durationSeconds`. */
  readonly now: number;
  readonly durationSeconds?: number;
  /** Vehicle id and plate the field belongs to; the consent must cover one of them. */
  readonly vehicleKeys?: readonly string[];
}): RevealResult {
  const {
    field,
    purpose,
    actor,
    subject = 'Family member',
    consent,
    rawValue,
    now,
    durationSeconds = 60,
    vehicleKeys,
  } = params;

  // 1. Validate Purpose
  const purposeCheck = validatePurpose(purpose);
  if (!purposeCheck.valid) {
    return {
      ok: false,
      error: purposeCheck.reason ?? 'Invalid purpose.',
    };
  }

  // 2. Validate Access Permissions
  if (!canAccess(field, consent, now, vehicleKeys)) {
    return {
      ok: false,
      error: `Access denied: Actor '${actor}' does not have active granted permission to reveal field '${field}'.`,
    };
  }

  const expiresAt = now + durationSeconds;

  const auditEntry: AuditEntry = {
    id: `audit-reveal-${field}-${now}`,
    at: now,
    actor,
    subject,
    field,
    action: 'reveal',
    purpose: purpose.trim(),
    result: 'allowed',
  };

  return {
    ok: true,
    value: rawValue,
    expiresAt,
    auditEntry,
  };
}
