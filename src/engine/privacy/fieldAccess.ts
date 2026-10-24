/**
 * Pure Privacy and Field Access Control
 *
 * Rules:
 * - "view" shows vehicle renewal tasks and due dates;
 * - "apply" adds starting applications;
 * - "register_new" allows starting a new-vehicle registration.
 * - ALWAYS hidden from the grantee, regardless of scope:
 *   - the family member's licence details,
 *   - challan history and locations,
 *   - Aadhaar,
 *   - and any field not explicitly covered.
 */

import type { Consent } from '../model/types';
import { evaluateConsentStatus } from './consent';

const ALWAYS_HIDDEN_FIELDS = new Set([
  'aadhaar',
  'aadhaarnumber',
  'aadhaardemo',
  'dl',
  'dlnumber',
  'dldemo',
  'licence',
  'licencedetails',
  'challans',
  'challanhistory',
  'challansdemo',
  'locations',
  'violationlocations',
]);

const VIEW_FIELDS = new Set([
  'vehicle.plate',
  'vehicle.tasks',
  'vehicle.duedate',
  'vehicle.lsd',
  'vehicle.status',
  'vehicle.type',
  'vehicle.make',
  'vehicle.chassis',
  'vehicle.engine',
  'vehicle.puc',
  'vehicle.pucexpiry',
  'vehicle.insurance',
  'vehicle.insuranceexpiry',
  'vehicle.fitness',
  'vehicle.fitnessexpiry',
  'tasks',
  'duedate',
  'lsd',
  'status',
  'chassis',
  'engine',
  'pucexpiry',
  'insuranceexpiry',
]);

const APPLY_FIELDS = new Set([
  'vehicle.apply',
  'vehicle.action',
  'apply',
  'action',
  'puc.renew',
  'insurance.renew',
]);

const REGISTER_NEW_FIELDS = new Set([
  'vehicle.register_new',
  'vehicle.newregistration',
  'register_new',
]);

/**
 * `now` and `consent.until` share one unit (the app uses epoch seconds).
 * When `vehicleKeys` is given (e.g. the vehicle id and plate), the consent must cover one of them.
 */
export function canAccess(
  field: string,
  consent: Consent | null,
  now: number,
  vehicleKeys?: readonly string[]
): boolean {
  if (!consent) return false;
  if (vehicleKeys && !vehicleKeys.some((k) => consent.vehicleIds.includes(k))) return false;

  const normalizedField = field.trim().toLowerCase();

  // 1. Strict Exclusion Check (Always Hidden)
  if (
    ALWAYS_HIDDEN_FIELDS.has(normalizedField) ||
    normalizedField.startsWith('dl.') ||
    normalizedField.startsWith('licence.') ||
    normalizedField.startsWith('aadhaar.') ||
    normalizedField.startsWith('challan.')
  ) {
    return false;
  }

  // 2. Check Consent Status against `now`
  const status = evaluateConsentStatus(consent, now);
  if (status !== 'granted') {
    return false;
  }

  // 3. Evaluate Scopes
  const scopes = new Set(consent.scopes);

  if (scopes.has('register_new') && REGISTER_NEW_FIELDS.has(normalizedField)) {
    return true;
  }

  if (scopes.has('apply') && (APPLY_FIELDS.has(normalizedField) || VIEW_FIELDS.has(normalizedField))) {
    return true;
  }

  if (scopes.has('view') && VIEW_FIELDS.has(normalizedField)) {
    return true;
  }

  return false;
}
