import { describe, it, expect } from 'vitest';
import {
  maskAadhaar,
  maskDL,
  maskChassis,
  maskEngine,
  maskPlate,
} from '../../src/engine/privacy/masking';

describe('Privacy Engine: Masking Functions', () => {
  describe('maskAadhaar', () => {
    it('masks full 12-digit Aadhaar revealing only last 4', () => {
      expect(maskAadhaar('123456789012')).toBe('XXXX-XXXX-9012');
      expect(maskAadhaar('DEMO-0000-1234')).toBe('XXXX-XXXX-1234');
    });

    it('never exposes more than 4 characters for any input length', () => {
      const inputs = ['', '1', '12', '123', '1234', '12345678901234567890'];
      for (const inp of inputs) {
        const masked = maskAadhaar(inp);
        expect(masked.startsWith('XXXX-XXXX-')).toBe(true);
        const exposed = masked.slice(10);
        expect(exposed.length).toBeLessThanOrEqual(4);
      }
    });
  });

  describe('maskDL', () => {
    it('masks driving licence retaining state code and last 4 digits', () => {
      expect(maskDL('TS-09-2015-0004471')).toBe('TS••••4471');
      expect(maskDL('KA0320200001234')).toBe('KA••••1234');
    });

    it('handles short or malformed inputs safely', () => {
      expect(maskDL('')).toBe('XX••••XXXX');
      expect(maskDL('K')).toBe('XX••••XXXX');
      expect(maskDL('DL1234')).toBe('DL••••1234');
    });
  });

  describe('maskChassis & maskEngine', () => {
    it('reveals only the last 5 characters', () => {
      expect(maskChassis('ME4JC481234567890')).toBe('•••••67890');
      expect(maskEngine('JC48E12345678')).toBe('•••••45678');
    });

    it('never exposes more than 5 characters for short inputs', () => {
      expect(maskChassis('123')).toBe('•••••XX123');
      expect(maskEngine('')).toBe('•••••XXXXX');
    });
  });

  describe('maskPlate', () => {
    it('masks registration plate keeping state, RTO, and last 2 digits', () => {
      expect(maskPlate('KA-03-MJ-4578')).toBe('KA-03-**-**78');
      expect(maskPlate('TS09EB4471')).toBe('TS-09-**-**71');
    });

    it('handles short inputs without crashing', () => {
      expect(maskPlate('')).toBe('**-**-**-****');
      expect(maskPlate('KA')).toBe('**-**-**-****');
    });
  });

  describe('Property Invariant: Never Expose Extra Data', () => {
    it('property check across random characters and lengths', () => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ';
      for (let len = 0; len <= 30; len++) {
        let str = '';
        for (let i = 0; i < len; i++) {
          str += alphabet[Math.floor((i * 7 + len * 13) % alphabet.length)];
        }

        const aadh = maskAadhaar(str);
        expect(aadh.replace(/[^0-9A-Z]/g, '').length).toBeLessThanOrEqual(12);

        const dl = maskDL(str);
        expect(dl).toMatch(/^[A-Z]{2}••••[0-9A-Z]{4}$/);

        const ch = maskChassis(str);
        expect(ch.startsWith('•••••')).toBe(true);

        const pl = maskPlate(str);
        expect(pl.includes('**')).toBe(true);
      }
    });
  });
});
