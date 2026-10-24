/**
 * Multilingual Word Dictionaries for Voice and Plate Entry
 *
 * Rules:
 * - Pure data structures passed into engine functions.
 * - Telugu and Kannada word lists, and read-back prompts carry `needsNativeReview: true`.
 */

export interface LanguageDictionary {
  readonly letterNames: Record<string, string>;
  readonly natoAlphabet: Record<string, string>;
  readonly digits: Record<string, string>;
  readonly stateNames: Record<string, string>;
  readonly confirmationPrompt: string;
  readonly needsNativeReview: boolean;
}

export const ENGLISH_LETTERS: Record<string, string> = {
  a: 'A',
  ay: 'A',
  b: 'B',
  bee: 'B',
  c: 'C',
  see: 'C',
  d: 'D',
  dee: 'D',
  e: 'E',
  ee: 'E',
  f: 'F',
  ef: 'F',
  g: 'G',
  jee: 'G',
  h: 'H',
  aitch: 'H',
  i: 'I',
  eye: 'I',
  j: 'J',
  jay: 'J',
  k: 'K',
  kay: 'K',
  l: 'L',
  el: 'L',
  m: 'M',
  em: 'M',
  n: 'N',
  en: 'N',
  o: 'O',
  oh: 'O',
  p: 'P',
  pee: 'P',
  q: 'Q',
  cue: 'Q',
  r: 'R',
  ar: 'R',
  s: 'S',
  ess: 'S',
  t: 'T',
  tee: 'T',
  u: 'U',
  you: 'U',
  v: 'V',
  vee: 'V',
  w: 'W',
  'double-you': 'W',
  doubleyou: 'W',
  x: 'X',
  ex: 'X',
  y: 'Y',
  why: 'Y',
  z: 'Z',
  zed: 'Z',
  zee: 'Z',
};

export const NATO_ALPHABET: Record<string, string> = {
  alpha: 'A',
  alfa: 'A',
  bravo: 'B',
  charlie: 'C',
  delta: 'D',
  echo: 'E',
  foxtrot: 'F',
  golf: 'G',
  hotel: 'H',
  india: 'I',
  juliett: 'J',
  juliet: 'J',
  kilo: 'K',
  lima: 'L',
  mike: 'M',
  november: 'N',
  oscar: 'O',
  papa: 'P',
  quebec: 'Q',
  romeo: 'R',
  sierra: 'S',
  tango: 'T',
  uniform: 'U',
  victor: 'V',
  whiskey: 'W',
  'x-ray': 'X',
  xray: 'X',
  yankee: 'Y',
  zulu: 'Z',
};

export const ENGLISH_DIGITS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
};

export const HINDI_DIGITS: Record<string, string> = {
  shunya: '0',
  ek: '1',
  do: '2',
  teen: '3',
  char: '4',
  chaar: '4',
  paanch: '5',
  panch: '5',
  chhe: '6',
  che: '6',
  saat: '7',
  sat: '7',
  aath: '8',
  ath: '8',
  nau: '9',
};

export const TELUGU_DIGITS: Record<string, string> = {
  sunna: '0',
  okati: '1',
  rendu: '2',
  moodu: '3',
  naalugu: '4',
  aidu: '5',
  aaru: '6',
  edu: '7',
  enimidi: '8',
  tommidi: '9',
};

export const KANNADA_DIGITS: Record<string, string> = {
  sonne: '0',
  ondu: '1',
  eradu: '2',
  mooru: '3',
  naalku: '4',
  aidu: '5',
  aaru: '6',
  elu: '7',
  entu: '8',
  ombattu: '9',
};

export const FILLER_WORDS = new Set([
  'number',
  'is',
  'uh',
  'um',
  'the',
  'my',
  'vehicle',
  'plate',
  'car',
  'bike',
  'gaadi',
  'vahan',
]);

export const STATE_NAMES: Record<string, Record<'en' | 'hi' | 'te' | 'kn', string>> = {
  KA: { en: 'Karnataka', hi: 'कर्नाटक', te: 'కర్ణాటక', kn: 'ಕರ್ನಾಟಕ' },
  TS: { en: 'Telangana', hi: 'तेलंगाना', te: 'తెలంగాణ', kn: 'ತೆಲಂಗಾಣ' },
  MH: { en: 'Maharashtra', hi: 'महाराष्ट्र', te: 'మహారాష్ట్ర', kn: 'ಮಹಾರಾಷ್ಟ್ರ' },
  TN: { en: 'Tamil Nadu', hi: 'तमिलनाडु', te: 'తమిళనాడు', kn: 'ತಮಿಳುನಾಡು' },
  DL: { en: 'Delhi', hi: 'दिल्ली', te: 'ఢిల్లీ', kn: 'ದೆಹಲಿ' },
  SK: { en: 'Sikkim', hi: 'सिक्किम', te: 'సిక్కిం', kn: 'సిక్కిం' },
  BH: { en: 'Bharat Series', hi: 'भारत सीरीज़', te: 'భారత్ సిరీస్', kn: 'ಭಾರತ್ ಸರಣಿ' },
};

export const CONFIRMATION_PROMPTS: Record<'en' | 'hi' | 'te' | 'kn', string> = {
  en: 'Is this your vehicle registration number?',
  hi: 'क्या यह आपका वाहन पंजीकरण नंबर है?',
  te: 'ఇది మీ వాహన నమోదు సంఖ్యేనా?',
  kn: 'ಇದು ನಿಮ್ಮ ವಾಹನ ನೋಂದಣಿ ಸಂಖ್ಯೆಯೇ?',
};

export const NATIVE_REVIEW_REQUIRED: Record<'en' | 'hi' | 'te' | 'kn', boolean> = {
  en: false,
  hi: false,
  te: true,
  kn: true,
};
