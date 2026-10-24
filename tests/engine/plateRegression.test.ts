import { describe, it, expect } from 'vitest';
import { parsePlate } from '../../src/engine/parse/index';
import {
  ENGLISH_LETTERS,
  NATO_ALPHABET,
  ENGLISH_DIGITS,
  HINDI_DIGITS,
  TELUGU_DIGITS,
  KANNADA_DIGITS,
  FILLER_WORDS,
} from '../../src/i18n/words';
import type { Dictionaries } from '../../src/engine/parse/index';

const dict: Dictionaries = {
  letterNames: ENGLISH_LETTERS,
  natoAlphabet: NATO_ALPHABET,
  digits: ENGLISH_DIGITS,
  hindiDigits: HINDI_DIGITS,
  teluguDigits: TELUGU_DIGITS,
  kannadaDigits: KANNADA_DIGITS,
  fillerWords: FILLER_WORDS,
};

const top = (input: string) => parsePlate(input, dict).candidates[0]?.formatted;
const all = (input: string) => parsePlate(input, dict).candidates.map((c) => c.formatted);

describe('Plate parser: series letters that look like digits', () => {
  it.each([
    ['KA01AB123', 'KA-01-AB-0123'],
    ['KA03AS123', 'KA-03-AS-0123'],
    ['KA05HB1', 'KA-05-HB-0001'],
    ['KA3B1234', 'KA-03-B-1234'],
    ['MH 04 EE S678', 'MH-04-EE-5678'],
    ['TS09EB4471', 'TS-09-EB-4471'],
    ['KA 03 MJ 4578', 'KA-03-MJ-4578'],
  ])('reads %s as %s', (input, expected) => {
    expect(top(input)).toBe(expected);
  });

  it('keeps the alternative reading available instead of silently choosing', () => {
    expect(all('KA01AB123')).toContain('KA-01-A-8123');
    expect(all('KA3B1234')).toContain('KA-38-1234');
  });

  it('still corrects look-alikes in the right segment', () => {
    const c = parsePlate('KA O3 MJ 4578', dict).candidates[0]!;
    expect(c.formatted).toBe('KA-03-MJ-4578');
    expect(c.fixes.map((f) => `${f.original}>${f.corrected}`)).toEqual(['O>0']);
  });
});

describe('Plate parser: rejects what cannot be a plate', () => {
  it('rejects digits that cannot fill State + RTO + Number', () => {
    expect(parsePlate('KA 9999999', dict).candidates).toEqual([]);
  });

  it('reads six digits after the state code as RTO + number (RTO existence is not checked)', () => {
    expect(top('KA 999999')).toBe('KA-99-9999');
  });

  it('does not offer a nonsense reading next to a BH plate', () => {
    const res = parsePlate('22BH1234AA', dict);
    expect(res.candidates.map((c) => c.formatted)).toEqual(['22 BH 1234 AA']);
  });

  it('reads typed capital letter pairs literally, not as spoken names', () => {
    expect(parsePlate('25 BH 4321 EF', dict).candidates[0]?.formatted).toBe('25 BH 4321 EF');
    expect(top('TS 08 EF 9012')).toBe('TS-08-EF-9012');
  });

  it('flags an unknown state code as invalid', () => {
    const res = parsePlate('ZZ01AB1234', dict);
    expect(res.candidates[0]?.isValid).toBe(false);
  });
});

describe('Plate parser: Delhi', () => {
  it('returns one Delhi reading for a class-letter plate', () => {
    expect(all('DL1CAB1234')).toEqual(['DL-01-CAB-1234']);
    expect(parsePlate('DL1CAB1234', dict).candidates[0]?.format).toBe('delhi');
  });
});
