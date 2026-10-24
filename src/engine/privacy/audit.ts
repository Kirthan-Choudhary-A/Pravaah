/**
 * Pure Audit Log Management
 *
 * Rules:
 * - Immutable array append; never mutates.
 * - Pure TypeScript with zero side-effects.
 */

import type { AuditEntry, AuditAction } from '../model/types';

export function appendAudit(
  log: readonly AuditEntry[],
  entry: AuditEntry
): readonly AuditEntry[] {
  return [...log, entry];
}

export function filterAuditLog(
  log: readonly AuditEntry[],
  filters: {
    readonly actor?: string;
    readonly field?: string;
    readonly action?: AuditAction;
  }
): readonly AuditEntry[] {
  return log.filter((entry) => {
    if (filters.actor && entry.actor.toLowerCase() !== filters.actor.toLowerCase()) {
      return false;
    }
    if (filters.field && entry.field.toLowerCase() !== filters.field.toLowerCase()) {
      return false;
    }
    if (filters.action && entry.action !== filters.action) {
      return false;
    }
    return true;
  });
}
