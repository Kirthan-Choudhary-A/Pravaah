/**
 * Utility to reset all Pravaah demo state, localStorage, and consents.
 */

export const DEMO_RESET_EVENT = 'pravaah:reset-demo';

export function resetDemoStorage(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('pravaah_household_vehicles');
      window.localStorage.removeItem('pravaah_consents_v2');
      window.localStorage.removeItem('pravaah_audit_log_v2');
    }
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEMO_RESET_EVENT));
  }
}
