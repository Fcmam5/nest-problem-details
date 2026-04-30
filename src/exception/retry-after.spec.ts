import { formatRetryAfter } from './retry-after';

describe('formatRetryAfter', () => {
  describe('number → delta-seconds', () => {
    it('serializes positive integers', () => {
      expect(formatRetryAfter(60)).toBe('60');
      expect(formatRetryAfter(0)).toBe('0');
      expect(formatRetryAfter(3600)).toBe('3600');
    });

    it('rounds up fractional seconds to never retry sooner than requested', () => {
      expect(formatRetryAfter(1.1)).toBe('2');
      expect(formatRetryAfter(0.5)).toBe('1');
      // Sub-epsilon values still round up to 1 (caller asked for some delay).
      expect(formatRetryAfter(Number.EPSILON)).toBe('1');
    });

    it('rejects negative seconds', () => {
      expect(formatRetryAfter(-1)).toBeUndefined();
      expect(formatRetryAfter(-0.5)).toBeUndefined();
    });

    it('accepts negative zero as zero', () => {
      expect(formatRetryAfter(-0)).toBe('0');
    });

    it('rejects non-finite numbers', () => {
      expect(formatRetryAfter(Number.POSITIVE_INFINITY)).toBeUndefined();
      expect(formatRetryAfter(Number.NaN)).toBeUndefined();
    });

    it('rejects values that would serialize as scientific notation (RFC 9110 §10.2.3 1*DIGIT)', () => {
      // (1e21).toString() === "1e+21" — invalid per the delta-seconds grammar.
      expect(formatRetryAfter(1e21)).toBeUndefined();
      expect(formatRetryAfter(Number.MAX_VALUE)).toBeUndefined();
    });

    it('accepts values up to MAX_SAFE_INTEGER (still decimal-formatted)', () => {
      expect(formatRetryAfter(Number.MAX_SAFE_INTEGER)).toBe(
        '9007199254740991',
      );
    });
  });

  describe('Date → IMF-fixdate', () => {
    it('serializes valid Date via toUTCString', () => {
      const date = new Date('2026-04-30T05:00:00Z');
      expect(formatRetryAfter(date)).toBe(date.toUTCString());
    });

    it('rejects invalid Date', () => {
      expect(formatRetryAfter(new Date('not-a-date'))).toBeUndefined();
    });
  });

  describe('string passthrough', () => {
    it('returns caller-formatted strings unchanged', () => {
      expect(formatRetryAfter('Wed, 21 Oct 2026 07:28:00 GMT')).toBe(
        'Wed, 21 Oct 2026 07:28:00 GMT',
      );
      expect(formatRetryAfter('120')).toBe('120');
    });

    it('rejects empty / whitespace-only strings', () => {
      expect(formatRetryAfter('')).toBeUndefined();
      expect(formatRetryAfter('   ')).toBeUndefined();
      expect(formatRetryAfter('\t\n')).toBeUndefined();
    });
  });

  describe('non-RetryAfterValue inputs', () => {
    it('returns undefined for null, undefined, boolean, object, array', () => {
      expect(formatRetryAfter(null)).toBeUndefined();
      expect(formatRetryAfter(undefined)).toBeUndefined();
      expect(formatRetryAfter(true)).toBeUndefined();
      expect(formatRetryAfter({})).toBeUndefined();
      expect(formatRetryAfter([])).toBeUndefined();
    });
  });
});
