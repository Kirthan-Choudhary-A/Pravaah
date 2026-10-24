/**
 * Pure Privacy Masking Functions
 *
 * Rule:
 * A mask never exposes more than its stated characters, for any input length.
 * Zero external dependencies. Pure TypeScript.
 */

/**
 * Masks Aadhaar: Only the last 4 digits are revealed in XXXX-XXXX-1234 format.
 */
export function maskAadhaar(raw: string): string {
  if (!raw) return 'XXXX-XXXX-XXXX';
  const clean = raw.replace(/[\s-]/g, '');
  if (clean.length === 0) return 'XXXX-XXXX-XXXX';
  const last4 = clean.length >= 4 ? clean.slice(-4) : clean.padStart(4, 'X');
  return `XXXX-XXXX-${last4}`;
}

/**
 * Masks Driving Licence: State code + "••••" + last 4 digits.
 * E.g., "TS-09-2015-0001234" -> "TS••••1234"
 */
export function maskDL(raw: string): string {
  if (!raw) return 'XX••••XXXX';
  const clean = raw.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length < 2) return 'XX••••XXXX';
  const letters = clean.replace(/[^A-Z]/g, '');
  const stateCode = letters.length >= 2 ? letters.slice(0, 2) : 'XX';
  const remaining = clean.slice(2);
  const last4 = remaining.length >= 4 ? remaining.slice(-4) : remaining.padStart(4, 'X');
  return `${stateCode}••••${last4}`;
}

/**
 * Masks Chassis Number: Reveals only the last 5 characters.
 */
export function maskChassis(raw: string): string {
  if (!raw) return '•••••XXXXX';
  const clean = raw.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length === 0) return '•••••XXXXX';
  const last5 = clean.length >= 5 ? clean.slice(-5) : clean.padStart(5, 'X');
  return `•••••${last5}`;
}

/**
 * Masks Engine Number: Reveals only the last 5 characters.
 */
export function maskEngine(raw: string): string {
  if (!raw) return '•••••XXXXX';
  const clean = raw.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length === 0) return '•••••XXXXX';
  const last5 = clean.length >= 5 ? clean.slice(-5) : clean.padStart(5, 'X');
  return `•••••${last5}`;
}

/**
 * Masks Registration Plate: "KA-03-**-**78" style.
 * Reveals only the State, RTO, and last 2 digits of the vehicle number.
 */
export function maskPlate(raw: string): string {
  if (!raw) return '**-**-**-****';
  const clean = raw.replace(/[\s-]/g, '').toUpperCase();
  if (clean.length < 4) return '**-**-**-****';

  const state = clean.slice(0, 2);
  const rto = clean.slice(2, 4);
  const tail = clean.slice(4);

  // Extract last 2 digits if available
  const digits = tail.match(/\d+/g)?.join('') || '';
  const last2Digits = digits.length >= 2 ? digits.slice(-2) : tail.slice(-2).padStart(2, '*');

  return `${state}-${rto}-**-**${last2Digits}`;
}
