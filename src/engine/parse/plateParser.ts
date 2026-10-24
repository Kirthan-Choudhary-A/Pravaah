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

  // Normalize delimiters; keep the original casing to tell "EE" (two letters) from "ee" (spoken E)
  const originalWords = text
    .replace(/[^A-Za-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
  const rawWords = originalWords.map((w) => w.toLowerCase());

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

    // 2b. A capitalised 2-3 letter token is typed letters, not a spoken letter name.
    // ponytail: an all-caps transcript of spoken names ("KAY AY") is misread; read-back catches it.
    const original = originalWords[i] ?? '';
    if (/^[A-Z]{2,3}$/.test(original) && !/^[0-9]$/.test(resolveSingleToken(word, dict) ?? '')) {
      characters.push(...original.split(''));
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

  // Check 2: Standard national layout (Delhi is the same layout with a class letter)
  candidateList.push(...parseStandardCandidates(chars));

  if (candidateList.length === 0) {
    return {
      success: false,
      candidates: [],
      error: 'Could not match input characters to standard Indian registration plate formats.',
    };
  }

  // Flag invalid state codes; drop them entirely when a known-state reading exists
  const flagged = candidateList.map((cand) => {
    if (!KNOWN_STATE_CODES.has(cand.state)) {
      return {
        ...cand,
        isValid: false,
        error: `Unknown state code '${cand.state}' – please check.`,
      };
    }
    return cand;
  });
  const validatedCandidates = flagged.some((c) => c.isValid)
    ? flagged.filter((c) => c.isValid)
    : flagged;

  return {
    success: true,
    candidates: validatedCandidates,
  };
}

/**
 * Fixes one segment to the expected character type. Returns null when a character
 * cannot be a letter/digit even after look-alike correction (e.g. '7' in a series).
 */
function fixSegment(
  chars: string[],
  from: number,
  to: number,
  type: 'letter' | 'digit',
  segmentName: string
): { readonly text: string; readonly fixes: PlateFix[] } | null {
  let text = '';
  const fixes: PlateFix[] = [];
  for (let i = from; i < to; i++) {
    const r = fixCharacter(chars[i]!, type, i, segmentName);
    const ok = type === 'digit' ? /^[0-9]$/.test(r.char) : /^[A-Z]$/.test(r.char);
    if (!ok) return null;
    text += r.char;
    if (r.fix) fixes.push(r.fix);
  }
  return { text, fixes };
}

/**
 * Every way to split the characters into State + RTO (1-2 digits) + Series (0-3 letters)
 * + Number (1-4 digits), best first: fewest look-alike fixes, then a 4-digit number,
 * then a 2-digit RTO. All valid splits are returned so the caller can ask, not guess.
 */
function parseStandardCandidates(chars: string[]): ParsedPlate[] {
  if (chars.length < 5) return [];
  const state = fixSegment(chars, 0, 2, 'letter', 'State Code');
  if (!state) return [];

  const found: { readonly plate: ParsedPlate; readonly score: number }[] = [];
  for (let numLen = 4; numLen >= 1; numLen--) {
    for (const rtoLen of [2, 1]) {
      const seriesLen = chars.length - 2 - rtoLen - numLen;
      if (seriesLen < 0 || seriesLen > 3) continue;
      const rto = fixSegment(chars, 2, 2 + rtoLen, 'digit', 'RTO');
      const series = fixSegment(chars, 2 + rtoLen, 2 + rtoLen + seriesLen, 'letter', 'Series');
      const num = fixSegment(chars, 2 + rtoLen + seriesLen, chars.length, 'digit', 'Number');
      if (!rto || !series || !num) continue;

      const rtoText = rto.text.padStart(2, '0');
      const number = num.text.padStart(4, '0');
      const formatted = series.text
        ? `${state.text}-${rtoText}-${series.text}-${number}`
        : `${state.text}-${rtoText}-${number}`;
      if (found.some((c) => c.plate.formatted === formatted)) continue;

      const fixes = [...state.fixes, ...rto.fixes, ...series.fixes, ...num.fixes];
      found.push({
        plate: {
          raw: chars.join(''),
          state: state.text,
          rto: rtoText,
          series: series.text,
          number,
          formatted,
          // Delhi encodes the vehicle class in the first series letter; same layout otherwise.
          format: state.text === 'DL' ? 'delhi' : 'standard',
          fixes,
          isValid: true,
        },
        // ponytail: modern plates are mostly 4-digit with at most a 2-letter series, so a
        // shorter number or a 3-letter series costs half a fix. Tune against real plates.
        score: fixes.length + (numLen < 4 ? 0.5 : 0) + (seriesLen === 3 ? 0.5 : 0),
      });
    }
  }
  // Array.sort is stable: ties keep the numLen/rtoLen preference order above.
  return found.sort((a, b) => a.score - b.score).map((c) => c.plate);
}

function tryParseBHSeries(chars: string[]): ParsedPlate | null {
  if (chars.length !== 10) return null;

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
 * Checks the plate's class letter against the rule pack of the plate's own state.
 * Never auto-corrects on mismatch; returns an interactive clarification question.
 */
export function checkPlateClass(
  plate: ParsedPlate,
  selectedVehicleType: string,
  pack?: RulePack | null
): ClassCheckResult {
  if (!pack) {
    return {
      status: 'unknown_pack',
      note: "Can't check: no rule pack is available for this state.",
    };
  }
  if (pack.stateCode !== plate.state) {
    return {
      status: 'unknown_pack',
      note: `Can't check: the rule pack is for ${pack.stateCode}, the plate is from ${plate.state}.`,
    };
  }
  if (!pack.classLetters) {
    return {
      status: 'unsupported',
      note: `No class letters are recorded for ${plate.state}, so the vehicle type is accepted as chosen.`,
    };
  }

  // The first series letter carries the class where a pack records it.
  const type = selectedVehicleType.toLowerCase().replace(/[\s-]/g, '');
  const isTwoWheeler = type.includes('twowheeler');
  const isCar = type === 'car';
  const expectedLetter = isTwoWheeler ? 'S' : isCar ? 'C' : null;

  if (!expectedLetter) {
    return {
      status: 'unsupported',
      note: `Vehicle category '${selectedVehicleType}' has no class letter in the ${plate.state} pack.`,
    };
  }

  const classOf = (letter: string): string =>
    letter === 'C' ? pack.classLetters!.C : letter === 'S' ? pack.classLetters!.S : `'${letter}'`;
  const firstSeriesLetter = plate.series.charAt(0).toUpperCase();
  const expectedClass = isTwoWheeler ? pack.classLetters.S : pack.classLetters.C;

  if (firstSeriesLetter !== expectedLetter) {
    const detectedClass = classOf(firstSeriesLetter);
    return {
      status: 'mismatch',
      detectedClass,
      expectedClass,
      question: `Plate ${plate.formatted} has class letter '${firstSeriesLetter}' (${detectedClass}), but vehicle is registered as a ${expectedClass}. Do you want to keep '${detectedClass}' or '${expectedClass}'?`,
      note: 'State encoding mismatch detected. User confirmation required; no auto-correction applied.',
    };
  }

  return { status: 'match', detectedClass: expectedClass, expectedClass };
}
