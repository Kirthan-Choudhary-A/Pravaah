/**
 * Pure Multilingual Read-Back Generator
 *
 * Rules:
 * - Generates clear phonetic readout for English, Hindi, Telugu, and Kannada.
 * - Spells out State, RTO digits, Series letters clearly, and Number digits.
 * - Returns structured segments for accessible visual rendering and a single string for speech synthesis.
 * - Zero side-effects; all dictionaries passed in.
 */

import type { ParsedPlate, ReadBackResult, ReadBackSegment } from '../model/types';

export interface ReadBackDictionaries {
  readonly stateNames: Record<string, Record<'en' | 'hi' | 'te' | 'kn', string>>;
  readonly confirmationPrompts: Record<'en' | 'hi' | 'te' | 'kn', string>;
  readonly englishDigits: Record<string, string>;
  readonly hindiDigits: Record<string, string>;
  readonly teluguDigits: Record<string, string>;
  readonly kannadaDigits: Record<string, string>;
  /** Word to letter (e.g. bravo to B). When given, series letters are spelled "B for Bravo". */
  readonly natoAlphabet?: Record<string, string>;
}

const DEFAULT_SPOKEN_DIGITS: Record<'en' | 'hi' | 'te' | 'kn', Record<string, string>> = {
  en: { '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine' },
  hi: { '0': 'shunya', '1': 'ek', '2': 'do', '3': 'teen', '4': 'chaar', '5': 'paanch', '6': 'chhe', '7': 'saat', '8': 'aath', '9': 'nau' },
  te: { '0': 'sunna', '1': 'okati', '2': 'rendu', '3': 'moodu', '4': 'naalugu', '5': 'aidu', '6': 'aaru', '7': 'edu', '8': 'enimidi', '9': 'tommidi' },
  kn: { '0': 'sonne', '1': 'ondu', '2': 'eradu', '3': 'mooru', '4': 'naalku', '5': 'aidu', '6': 'aaru', '7': 'elu', '8': 'entu', '9': 'ombattu' },
};

export function buildReadBack(
  plate: ParsedPlate,
  language: 'en' | 'hi' | 'te' | 'kn',
  dict: ReadBackDictionaries
): ReadBackResult {
  const stateRecord = dict.stateNames[plate.state] || {
    en: plate.state,
    hi: plate.state,
    te: plate.state,
    kn: plate.state,
  };

  const stateSpoken = stateRecord[language] || plate.state;
  const prompt = dict.confirmationPrompts[language];

  // Helper to get digit words in specified language
  const getDigitSpoken = (d: string): string => {
    const fallback = DEFAULT_SPOKEN_DIGITS[language]?.[d] || d;
    switch (language) {
      case 'hi': {
        const val = dict.hindiDigits[d];
        return val && !/^[0-9]$/.test(val) ? val : fallback;
      }
      case 'te': {
        const val = dict.teluguDigits[d];
        return val && !/^[0-9]$/.test(val) ? val : fallback;
      }
      case 'kn': {
        const val = dict.kannadaDigits[d];
        return val && !/^[0-9]$/.test(val) ? val : fallback;
      }
      case 'en':
      default: {
        const val = dict.englishDigits[d];
        return val && !/^[0-9]$/.test(val) ? val : fallback;
      }
    }
  };

  const rtoDigitsSpoken = plate.rto
    .split('')
    .map(getDigitSpoken)
    .join(' ');

  // Letter to NATO word, so "B" cannot be heard as "8" or "D" as "T"
  const natoByLetter = new Map<string, string>();
  for (const [word, letter] of Object.entries(dict.natoAlphabet ?? {})) {
    if (!natoByLetter.has(letter)) natoByLetter.set(letter, word.charAt(0).toUpperCase() + word.slice(1));
  }
  const seriesSpoken = natoByLetter.size
    ? plate.series
        .split('')
        .map((l) => (natoByLetter.has(l) ? `${l} for ${natoByLetter.get(l)}` : l))
        .join(', ')
    : plate.series.split('').join(' ');

  const numberDigitsSpoken = plate.number
    .split('')
    .map(getDigitSpoken)
    .join(' ');

  const segments: ReadBackSegment[] = [
    { text: stateSpoken, kind: 'state' },
    { text: rtoDigitsSpoken, kind: 'rto' },
    ...(plate.series ? [{ text: seriesSpoken, kind: 'series' as const }] : []),
    { text: numberDigitsSpoken, kind: 'number' },
    { text: prompt, kind: 'prompt' },
  ];

  let fullSpeech = '';
  if (language === 'hi') {
    fullSpeech = `${stateSpoken}, आरटीओ ${rtoDigitsSpoken}, सीरीज़ ${seriesSpoken}, नंबर ${numberDigitsSpoken}. ${prompt}`;
  } else if (language === 'te') {
    fullSpeech = `${stateSpoken}, ఆర్టీవో ${rtoDigitsSpoken}, సిరీస్ ${seriesSpoken}, నంబర్ ${numberDigitsSpoken}. ${prompt}`;
  } else if (language === 'kn') {
    fullSpeech = `${stateSpoken}, ಆರ್‌ಟಿಒ ${rtoDigitsSpoken}, ಸರಣಿ ${seriesSpoken}, ಸಂಖ್ಯೆ ${numberDigitsSpoken}. ${prompt}`;
  } else {
    fullSpeech = `${stateSpoken}, RTO ${rtoDigitsSpoken}, Series ${seriesSpoken}, Number ${numberDigitsSpoken}. ${prompt}`;
  }

  return {
    language,
    fullSpeech: fullSpeech.trim(),
    segments,
    confirmationPrompt: prompt,
  };
}
