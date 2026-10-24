/**
 * Pure Registration Plate Parser and Phonetic Tokenizer
 *
 * Rules:
 * - Pure TypeScript. No DOM, no network, no side-effects.
 * - Language dictionaries are passed in as arguments.
 * - Positional correction for look-alikes with detailed reasons.
 * - Multiple valid readings return all candidates; never silently choose.
 * - Unknown state codes return "Unknown state code – please check".
 */

import type {
  ParsedPlate,
  PlateFix,
  PlateParseResult,
  ClassCheckResult,
  RulePack,
} from '../model/types';

export const KNOWN_STATE_CODES = new Set([
  'AN',
  'AP',
  'AR',
  'AS',
  'BR',
  'CG',
  'CH',
  'DD',
  'DL',
  'DN',
  'GA',
  'GJ',
  'HP',
  'HR',
  'JH',
  'JK',
  'KA',
  'KL',
  'LA',
  'LD',
  'MH',
  'ML',
  'MN',
  'MP',
  'MZ',
  'NL',
  'OD',
  'PB',
  'PY',
  'RJ',
  'SK',
  'TN',
  'TR',
  'TS',
  'UK',
  'UP',
  'WB',
  'BH',
]);

export interface Dictionaries {
  readonly letterNames: Record<string, string>;
  readonly natoAlphabet: Record<string, string>;
  readonly digits: Record<string, string>;
  readonly hindiDigits?: Record<string, string>;
  readonly teluguDigits?: Record<string, string>;
  readonly kannadaDigits?: Record<string, string>;
  readonly fillerWords: Set<string>;
}

/**
 * Tokenizes raw transcript or spoken text into an array of characters.
 * Handles letter names, NATO alphabet, English/Hindi/Telugu/Kannada digits,
 * multipliers ("double X", "triple X"), and ignores fillers.
 */
export function transcriptToCharacters(text: string, dict: Dictionaries): string[] {
  if (!text) return [];

  // Normalize delimiters and lowercase
  const rawWords = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);

  const characters: string[] = [];
  let i = 0;

  while (i < rawWords.length) {
    const word = rawWords[i];
    if (!word) {
      i++;
      continue;
    }

    // 1. Ignore filler words
    if (dict.fillerWords.has(word)) {
      i++;
      continue;
    }

    // 2. Multipliers: "double" or "triple"
    if (word === 'double' || word === 'triple') {
      const repeatCount = word === 'double' ? 2 : 3;
      const nextWord = rawWords[i + 1];
      if (nextWord) {
        const char = resolveSingleToken(nextWord, dict);
        if (char) {
          for (let r = 0; r < repeatCount; r++) {
            characters.push(char);
          }
          i += 2;
          continue;
        }
      }
      i++;
      continue;
    }

    // 3. Normal token resolution
    // If the word has length > 1 and is not in dictionaries, check if it's already literal characters (e.g. "KA03")
    const singleChar = resolveSingleToken(word, dict);
    if (singleChar) {
      characters.push(singleChar);
      i++;
      continue;
    }

    // Break compound literals, e.g. "ts09" -> "t", "s", "0", "9"
    let allResolved = true;
    const subChars: string[] = [];
    for (const char of word) {
      const resolved = resolveSingleToken(char, dict);
      if (resolved) {
        subChars.push(resolved);
      } else {
        allResolved = false;
        break;
      }
    }

    if (allResolved && subChars.length > 0) {
      characters.push(...subChars);
    }

    i++;
  }

  return characters;
}

function resolveSingleToken(token: string, dict: Dictionaries): string | null {
  const t = token.toLowerCase();

  // English letters
  if (dict.letterNames[t]) return dict.letterNames[t];

  // NATO words
  if (dict.natoAlphabet[t]) return dict.natoAlphabet[t];

  // English digits
  if (dict.digits[t]) return dict.digits[t];

  // Hindi digits
  if (dict.hindiDigits && dict.hindiDigits[t]) return dict.hindiDigits[t];

  // Telugu digits
  if (dict.teluguDigits && dict.teluguDigits[t]) return dict.teluguDigits[t];

  // Kannada digits
  if (dict.kannadaDigits && dict.kannadaDigits[t]) return dict.kannadaDigits[t];

  // Single ASCII letter
  if (/^[a-z]$/i.test(t)) return t.toUpperCase();

  // Single digit
  if (/^[0-9]$/.test(t)) return t;

  return null;
}

/**
 * Positional look-alike character fixer
 */
function fixCharacter(
  char: string,
  expectedType: 'letter' | 'digit',
  pos: number,
  segmentName: string
): { readonly char: string; readonly fix?: PlateFix } {
  if (expectedType === 'digit') {
    if (/[0-9]/.test(char)) return { char };
    const fixes: Record<string, string> = {
      O: '0',
      o: '0',
      B: '8',
      b: '8',
      S: '5',
      s: '5',
      Z: '2',
      z: '2',
      I: '1',
      i: '1',
      D: '0',
      d: '0',
      G: '6',
      g: '6',
    };
    if (fixes[char]) {
      const corrected = fixes[char];
      return {
        char: corrected,
        fix: {
          position: pos,
          original: char,
          corrected,
          reason: `'${char}' changed to '${corrected}' because the ${segmentName} part must be digits`,
        },
      };
    }
    return { char };
  } else {
    // expectedType === 'letter'
    if (/[A-Z]/i.test(char)) return { char: char.toUpperCase() };
    const letterFixes: Record<string, string> = {
      '0': 'O',
      '8': 'B',
      '5': 'S',
      '2': 'Z',
      '1': 'I',
      '6': 'G',
    };
    if (letterFixes[char]) {
      const corrected = letterFixes[char];
      return {
        char: corrected,
        fix: {
          position: pos,
          original: char,
          corrected,
          reason: `'${char}' changed to '${corrected}' because the ${segmentName} part must be letters`,
        },
      };
    }
    return { char: char.toUpperCase() };
  }
}

/**
 * Parses raw text or transcript into segmented registration plate candidates.
 */
export function parsePlate(rawText: string, dict: Dictionaries): PlateParseResult {
  if (!rawText || rawText.trim().length === 0) {
    return { success: false, candidates: [], error: 'Input transcript is empty.' };
  }

  const chars = transcriptToCharacters(rawText, dict);
  if (chars.length < 5) {
    return {
      success: false,
      candidates: [],
      error: 'Insufficient characters to construct a valid vehicle registration plate.',
    };
  }

  const candidateList: ParsedPlate[] = [];

  // Check 1: BH Series Format (YY BH NNNN XX)
  const bhCandidate = tryParseBHSeries(chars);
  if (bhCandidate) {
    candidateList.push(bhCandidate);
  }

  // Check 2: Delhi Format (DL + 1-2 digits + class letter + 0-3 series letters + 1-4 digits)
  const delhiCandidate = tryParseDelhiFormat(chars);
  if (delhiCandidate) {
    candidateList.push(delhiCandidate);
  }

  // Check 3: Standard National Format (State 2 letters + RTO 1-2 digits + Series 0-3 letters + Number 1-4 digits)
  const standardCandidate = tryParseStandardFormat(chars);
  if (standardCandidate) {
    candidateList.push(standardCandidate);
  }

  if (candidateList.length === 0) {
    return {
      success: false,
      candidates: [],
      error: 'Could not match input characters to standard Indian registration plate formats.',
    };
  }

  // Filter invalid state codes
  const validatedCandidates = candidateList.map((cand) => {
    if (!KNOWN_STATE_CODES.has(cand.state)) {
      return {
        ...cand,
        isValid: false,
        error: `Unknown state code '${cand.state}' – please check.`,
      };
    }
    return cand;
  });

  return {
    success: true,
    candidates: validatedCandidates,
  };
}

function tryParseStandardFormat(chars: string[]): ParsedPlate | null {
  if (chars.length < 5) return null;
  const fixes: PlateFix[] = [];

  // 1. State Code (Pos 0, 1) -> Letters
  const s0 = fixCharacter(chars[0]!, 'letter', 0, 'State Code');
  if (s0.fix) fixes.push(s0.fix);
  const s1 = fixCharacter(chars[1]!, 'letter', 1, 'State Code');
  if (s1.fix) fixes.push(s1.fix);
  const state = s0.char + s1.char;

  // 2. RTO Digits (Pos 2, and optionally 3)
  const r0 = fixCharacter(chars[2]!, 'digit', 2, 'RTO');
  if (r0.fix) fixes.push(r0.fix);

  let rto = r0.char;
  let nextIdx = 3;

  // Check if position 3 is also RTO digit or start of series letters
  if (nextIdx < chars.length) {
    const lookahead = chars[nextIdx]!;
    // If it's a digit or look-alike digit (0-9, O, B, etc.) and there are remaining letters afterwards
    const r1 = fixCharacter(lookahead, 'digit', 3, 'RTO');
    const remainingCharsCount = chars.length - (nextIdx + 1);

    // Standard plate needs at least 1 digit for number at the end
    if (r1.fix || /[0-9]/.test(lookahead)) {
      // If we take pos 3 as RTO digit, we need at least 1 digit for the number
      if (remainingCharsCount >= 1) {
        rto += r1.char;
        if (r1.fix) fixes.push(r1.fix);
        nextIdx++;
      }
    }
  }

  // Pad single digit RTO for standard display (e.g. "3" -> "03")
  if (rto.length === 1) {
    rto = '0' + rto;
  }

  // 3. Series Letters & Number Digits
  // Split remaining characters from end: the last 1 to 4 characters must be digits (the number)
  // Everything between RTO and number is the series letters
  let numStartIdx = chars.length;
  for (let idx = chars.length - 1; idx >= nextIdx; idx--) {
    const c = chars[idx]!;
    // If it's a digit or look-alike digit
    const dCheck = fixCharacter(c, 'digit', idx, 'Number');
    if (dCheck.fix || /[0-9]/.test(c)) {
      numStartIdx = idx;
    } else {
      break;
    }
  }

  // Ensure number has 1 to 4 digits
  if (numStartIdx >= chars.length || chars.length - numStartIdx > 4) {
    numStartIdx = Math.max(nextIdx, chars.length - 4);
  }

  // Extract series
  let series = '';
  for (let i = nextIdx; i < numStartIdx; i++) {
    const sChar = fixCharacter(chars[i]!, 'letter', i, 'Series');
    if (sChar.fix) fixes.push(sChar.fix);
    series += sChar.char;
  }

  // Extract number
  let rawNumber = '';
  for (let i = numStartIdx; i < chars.length; i++) {
    const nDigit = fixCharacter(chars[i]!, 'digit', i, 'Number');
    if (nDigit.fix) fixes.push(nDigit.fix);
    rawNumber += nDigit.char;
  }

  if (rawNumber.length === 0) return null;

  // Zero-pad number to 4 digits for official display
  const formattedNumber = rawNumber.padStart(4, '0');
  const formatted = series
    ? `${state}-${rto}-${series}-${formattedNumber}`
    : `${state}-${rto}-${formattedNumber}`;

  return {
    raw: chars.join(''),
    state,
    rto,
    series,
    number: formattedNumber,
    formatted,
    format: 'standard',
    fixes,
    isValid: true,
  };
}

function tryParseDelhiFormat(chars: string[]): ParsedPlate | null {
  if (chars.length < 6) return null;

  const fixes: PlateFix[] = [];
  const s0 = fixCharacter(chars[0]!, 'letter', 0, 'State Code');
  const s1 = fixCharacter(chars[1]!, 'letter', 1, 'State Code');
  if (s0.char + s1.char !== 'DL') return null;

  if (s0.fix) fixes.push(s0.fix);
  if (s1.fix) fixes.push(s1.fix);

  // RTO digit(s)
  const r0 = fixCharacter(chars[2]!, 'digit', 2, 'RTO');
  if (r0.fix) fixes.push(r0.fix);
  const rto = r0.char;
  let nextIdx = 3;

  // Class letter at nextIdx or pos 4
  const cChar = fixCharacter(chars[nextIdx]!, 'letter', nextIdx, 'Delhi Class Letter');
  // In Delhi, common class letters are 'C' (Car), 'S' (Two-Wheeler), 'P' (Passenger), etc.
  if (cChar.fix) fixes.push(cChar.fix);
  const classLetter = cChar.char;
  nextIdx++;

  // Remaining series and number
  const numStartIdx = Math.max(nextIdx, chars.length - 4);
  let series = '';
  for (let i = nextIdx; i < numStartIdx; i++) {
    const sc = fixCharacter(chars[i]!, 'letter', i, 'Series');
    if (sc.fix) fixes.push(sc.fix);
    series += sc.char;
  }

  let rawNumber = '';
  for (let i = numStartIdx; i < chars.length; i++) {
    const nd = fixCharacter(chars[i]!, 'digit', i, 'Number');
    if (nd.fix) fixes.push(nd.fix);
    rawNumber += nd.char;
  }

  if (rawNumber.length === 0) return null;
  const formattedNumber = rawNumber.padStart(4, '0');
  const fullSeries = `${classLetter}${series}`;
  const formatted = `DL-${rto.padStart(2, '0')}-${fullSeries}-${formattedNumber}`;

  return {
    raw: chars.join(''),
    state: 'DL',
    rto: rto.padStart(2, '0'),
    series: fullSeries,
    number: formattedNumber,
    formatted,
    format: 'delhi',
    fixes,
    isValid: true,
  };
}

function tryParseBHSeries(chars: string[]): ParsedPlate | null {
  if (chars.length < 8) return null;

  // BH pattern: YY BH NNNN XX
  // Look for "BH" at index 2,3
  const b0 = fixCharacter(chars[2]!, 'letter', 2, 'BH Mark');
  const b1 = fixCharacter(chars[3]!, 'letter', 3, 'BH Mark');

  if (b0.char !== 'B' || b1.char !== 'H') {
    return null;
  }

  const fixes: PlateFix[] = [];
  if (b0.fix) fixes.push(b0.fix);
  if (b1.fix) fixes.push(b1.fix);

  // Year digits (0, 1)
  const y0 = fixCharacter(chars[0]!, 'digit', 0, 'Year');
  if (y0.fix) fixes.push(y0.fix);
  const y1 = fixCharacter(chars[1]!, 'digit', 1, 'Year');
  if (y1.fix) fixes.push(y1.fix);
  const year = y0.char + y1.char;

  // Suffix (last 2 characters)
  const suffix0 = fixCharacter(chars[chars.length - 2]!, 'letter', chars.length - 2, 'BH Suffix');
  if (suffix0.fix) fixes.push(suffix0.fix);
  const suffix1 = fixCharacter(chars[chars.length - 1]!, 'letter', chars.length - 1, 'BH Suffix');
  if (suffix1.fix) fixes.push(suffix1.fix);
  const suffix = suffix0.char + suffix1.char;

  // Number digits (pos 4 to chars.length - 2)
  let rawNumber = '';
  for (let i = 4; i < chars.length - 2; i++) {
    const nd = fixCharacter(chars[i]!, 'digit', i, 'BH Number');
    if (nd.fix) fixes.push(nd.fix);
    rawNumber += nd.char;
  }

  if (rawNumber.length === 0) return null;
  const formattedNumber = rawNumber.padStart(4, '0');
  const formatted = `${year} BH ${formattedNumber} ${suffix}`;

  return {
    raw: chars.join(''),
    state: 'BH',
    rto: year,
    series: suffix,
    number: formattedNumber,
    formatted,
    format: 'bh',
    fixes,
    isValid: true,
  };
}

/**
 * Checks vehicle registration plate class letter against rule pack.
 * Never auto-corrects on mismatch; returns an interactive clarification question.
 */
export function checkPlateClass(
  plate: ParsedPlate,
  selectedVehicleType: string,
  pack?: RulePack | null
): ClassCheckResult {
  if (!pack || !pack.classLetters) {
    return {
      status: 'unknown_pack',
      note: "Can't check: rule pack or class letter mapping is not available for this state.",
    };
  }

  // Currently Delhi explicitly encodes class in the first letter of the series
  if (plate.state === 'DL') {
    const firstSeriesLetter = plate.series.charAt(0).toUpperCase();
    const isTwoWheeler = selectedVehicleType.toLowerCase().includes('two-wheeler');
    const isCar = selectedVehicleType.toLowerCase().includes('car');

    const expectedLetter = isTwoWheeler ? 'S' : isCar ? 'C' : null;

    if (!expectedLetter) {
      return {
        status: 'unsupported',
        note: `Vehicle category '${selectedVehicleType}' does not have a mapped class letter in Delhi pack.`,
      };
    }

    if (firstSeriesLetter !== expectedLetter) {
      const detectedClass =
        firstSeriesLetter === 'C'
          ? 'Car'
          : firstSeriesLetter === 'S'
            ? 'Two-Wheeler'
            : `'${firstSeriesLetter}'`;

      const expectedClass = isTwoWheeler ? 'Two-Wheeler' : 'Car';

      return {
        status: 'mismatch',
        detectedClass,
        expectedClass,
        question: `Plate ${plate.formatted} has class letter '${firstSeriesLetter}' (${detectedClass}), but vehicle is registered as a ${expectedClass}. Do you want to keep '${detectedClass}' or '${expectedClass}'?`,
        note: 'State encoding mismatch detected. User confirmation required; no auto-correction applied.',
      };
    }

    return {
      status: 'match',
      detectedClass: isTwoWheeler ? 'Two-Wheeler' : 'Car',
      expectedClass: isTwoWheeler ? 'Two-Wheeler' : 'Car',
    };
  }

  return {
    status: 'unsupported',
    note: `State ${plate.state} does not encode vehicle class in plate series. Accepted with note.`,
  };
}
