import { describe, it, expect } from 'vitest';
import {
  parsePlate,
  transcriptToCharacters,
  checkPlateClass,
  buildReadBack,
} from '../../src/engine/parse/index';
import {
  ENGLISH_LETTERS,
  NATO_ALPHABET,
  ENGLISH_DIGITS,
  HINDI_DIGITS,
  TELUGU_DIGITS,
  KANNADA_DIGITS,
  FILLER_WORDS,
  STATE_NAMES,
  CONFIRMATION_PROMPTS,
} from '../../src/i18n/words';
import type { Dictionaries, ReadBackDictionaries } from '../../src/engine/parse/index';
import type { RulePack } from '../../src/engine/model/types';

describe('Plate & Voice Engine: Parser and Read-Back', () => {
  const dict: Dictionaries = {
    letterNames: ENGLISH_LETTERS,
    natoAlphabet: NATO_ALPHABET,
    digits: ENGLISH_DIGITS,
    hindiDigits: HINDI_DIGITS,
    teluguDigits: TELUGU_DIGITS,
    kannadaDigits: KANNADA_DIGITS,
    fillerWords: FILLER_WORDS,
  };

  const readBackDict: ReadBackDictionaries = {
    stateNames: STATE_NAMES,
    confirmationPrompts: CONFIRMATION_PROMPTS,
    englishDigits: ENGLISH_DIGITS,
    hindiDigits: HINDI_DIGITS,
    teluguDigits: TELUGU_DIGITS,
    kannadaDigits: KANNADA_DIGITS,
  };

  const dummyDLPack: RulePack = {
    stateCode: 'DL',
    version: 'v2026.1',
    licenceStages: {
      renewalWindowDays: 365,
      graceDays: 30,
      drivingAllowedDuringGrace: true,
      lateFee: { base: 1000, perYear: 1000 },
      testAfterDays: 1825,
      verified: false,
      basis: 'statute',
      sourceIds: [],
      note: '',
    },
    reRegistrationLimitDays: { value: 365, basis: 'statute', sourceIds: [], verified: false, note: '' },
    rcAddressIntimationDays: { value: 30, basis: 'statute', sourceIds: [], verified: false, note: '' },
    servicesOnline: {
      licenceRenewal: true,
      licenceAddressChange: true,
      otherServices: [],
      basis: 'statute',
      sourceIds: [],
      verified: false,
      note: '',
    },
    licenceRenewalAtAnyRTO: { value: true, basis: 'statute', sourceIds: [], verified: false, note: '' },
    nocBlockedBy: [],
    nocAddressMustMatchRC: { value: true, basis: 'modelled', note: '' },
    classLetters: { S: 'S', C: 'C' },
    bhSeries: { exemptFromNOC: true, exemptFromReRegistration: true },
    fees: [],
  };

  describe('Demo Samples', () => {
    it('Sample 1: "kay ay oh three em jay four five seven eight" parses to KA-03-MJ-4578 with O->0 fix', () => {
      const res = parsePlate('kay ay oh three em jay four five seven eight', dict);
      expect(res.success).toBe(true);
      expect(res.candidates.length).toBeGreaterThanOrEqual(1);

      const candidate = res.candidates[0]!;
      expect(candidate.formatted).toBe('KA-03-MJ-4578');
      expect(candidate.state).toBe('KA');
      expect(candidate.rto).toBe('03');
      expect(candidate.series).toBe('MJ');
      expect(candidate.number).toBe('4578');

      // Positional fix verification
      const fix = candidate.fixes.find((f) => f.original === 'O');
      expect(fix).toBeDefined();
      expect(fix?.corrected).toBe('0');
      expect(fix?.reason).toContain('RTO part must be digits');
    });

    it('Sample 2: "tee ess zero nine ee eight double four seven one" parses to TS-09-EB-4471 with 8->B fix', () => {
      const res = parsePlate('tee ess zero nine ee eight double four seven one', dict);
      expect(res.success).toBe(true);

      const candidate = res.candidates[0]!;
      expect(candidate.formatted).toBe('TS-09-EB-4471');
      expect(candidate.state).toBe('TS');
      expect(candidate.rto).toBe('09');
      expect(candidate.series).toBe('EB');
      expect(candidate.number).toBe('4471');

      const fix = candidate.fixes.find((f) => f.original === '8');
      expect(fix).toBeDefined();
      expect(fix?.corrected).toBe('B');
      expect(fix?.reason).toContain('Series part must be letters');
    });

    it('Sample 3: "kay ay zero three em jay chaar paanch saat aath" parses correctly from Hindi digits', () => {
      const res = parsePlate('kay ay zero three em jay chaar paanch saat aath', dict);
      expect(res.success).toBe(true);

      const candidate = res.candidates[0]!;
      expect(candidate.formatted).toBe('KA-03-MJ-4578');
      expect(candidate.number).toBe('4578');
    });

    it('Sample 4: "dee el one see ay bee one two three four" with class mismatch flags question', () => {
      const res = parsePlate('dee el one see ay bee one two three four', dict);
      expect(res.success).toBe(true);

      const candidate = res.candidates.find((c) => c.state === 'DL')!;
      expect(candidate).toBeDefined();
      expect(candidate.formatted).toBe('DL-01-CAB-1234');

      // Vehicle is registered as two-wheeler, but DL class letter is C (Car)
      const check = checkPlateClass(candidate, 'two-wheeler', dummyDLPack);
      expect(check.status).toBe('mismatch');
      expect(check.question).toBeDefined();
      expect(check.question).toContain("class letter 'C' (Car)");
      expect(check.question).toContain('Two-Wheeler');
    });
  });

  describe('Multipliers and Phonetic Alphabets', () => {
    it('handles "double" and "triple" multipliers', () => {
      const chars = transcriptToCharacters('double four triple seven', dict);
      expect(chars).toEqual(['4', '4', '7', '7', '7']);
    });

    it('handles NATO alphabet words', () => {
      const chars = transcriptToCharacters('kilo alpha zero three mike juliett', dict);
      expect(chars).toEqual(['K', 'A', '0', '3', 'M', 'J']);
    });

    it('handles Telugu digits', () => {
      const chars = transcriptToCharacters('sunna okati rendu moodu', dict);
      expect(chars).toEqual(['0', '1', '2', '3']);
    });

    it('handles Kannada digits', () => {
      const chars = transcriptToCharacters('sonne ondu eradu mooru', dict);
      expect(chars).toEqual(['0', '1', '2', '3']);
    });
  });

  describe('BH Series and Special Formats', () => {
    it('parses BH-series vehicle plate: "22 BH 1234 AA"', () => {
      const res = parsePlate('two two bee aitch one two three four ay ay', dict);
      expect(res.success).toBe(true);

      const bhCand = res.candidates.find((c) => c.format === 'bh');
      expect(bhCand).toBeDefined();
      expect(bhCand?.formatted).toBe('22 BH 1234 AA');
      expect(bhCand?.state).toBe('BH');
    });

    it('flags unknown state code without guessing', () => {
      const res = parsePlate('zed zed zero one ay bee one two three four', dict);
      expect(res.success).toBe(true);
      const cand = res.candidates[0]!;
      expect(cand.isValid).toBe(false);
      expect(cand.error).toContain("Unknown state code 'ZZ'");
    });
  });

  describe('Multilingual Read-Back', () => {
    const sampleParsed = {
      raw: 'KA03MJ4578',
      state: 'KA',
      rto: '03',
      series: 'MJ',
      number: '4578',
      formatted: 'KA-03-MJ-4578',
      format: 'standard' as const,
      fixes: [],
      isValid: true,
    };

    it('generates English read-back', () => {
      const rb = buildReadBack(sampleParsed, 'en', readBackDict);
      expect(rb.language).toBe('en');
      expect(rb.fullSpeech).toContain('Karnataka');
      expect(rb.fullSpeech).toContain('RTO zero three');
      expect(rb.fullSpeech).toContain('Series M J');
      expect(rb.fullSpeech).toContain('Number four five seven eight');
      expect(rb.confirmationPrompt).toContain('registration number');
    });

    it('generates Hindi read-back', () => {
      const rb = buildReadBack(sampleParsed, 'hi', readBackDict);
      expect(rb.language).toBe('hi');
      expect(rb.fullSpeech).toContain('कर्नाटक');
      expect(rb.fullSpeech).toContain('आरटीओ shunya teen');
      expect(rb.confirmationPrompt).toContain('क्या यह आपका वाहन पंजीकरण नंबर है?');
    });

    it('generates Telugu read-back', () => {
      const rb = buildReadBack(sampleParsed, 'te', readBackDict);
      expect(rb.language).toBe('te');
      expect(rb.fullSpeech).toContain('కర్ణాటక');
      expect(rb.confirmationPrompt).toContain('ఇది మీ వాహన నమోదు సంఖ్యేనా?');
    });

    it('generates Kannada read-back', () => {
      const rb = buildReadBack(sampleParsed, 'kn', readBackDict);
      expect(rb.language).toBe('kn');
      expect(rb.fullSpeech).toContain('ಕರ್ನಾಟಕ');
      expect(rb.confirmationPrompt).toContain('ಇದು ನಿಮ್ಮ ವಾಹನ ನೋಂದಣಿ ಸಂಖ್ಯೆಯೇ?');
    });
  });
});
