/**
 * Value accepted for the `Retry-After` header.
 *
 * Per RFC 9110 §10.2.3:
 * - `number` → non-negative delta-seconds. Fractional values are rounded up
 *   (`Math.ceil`) so the client never retries sooner than the caller asked.
 * - `Date`   → absolute HTTP-date (serialized as IMF-fixdate via `toUTCString()`).
 * - `string` → caller-formatted value, passed through unchanged.
 */
export type RetryAfterValue = number | Date | string;

/**
 * Serialize a `RetryAfterValue` to its on-wire header string per RFC 9110 §10.2.3
 * (`delta-seconds = 1*DIGIT` or HTTP-date).
 *
 * Returns `undefined` for invalid inputs so the caller can skip the header
 * rather than emit garbage:
 *   - negative or non-finite numbers
 *   - numbers so large they'd serialize as scientific notation (≥ 1e21)
 *   - invalid `Date`
 *   - empty / whitespace-only strings
 */
export function formatRetryAfter(value: unknown): string | undefined {
  if (typeof value === 'number') {
    if (value < 0) return undefined;
    // `Math.ceil` rounds up so the client never retries sooner than requested.
    // The digit-only regex rejects NaN, ±Infinity, and scientific notation
    // (e.g. `(1e21).toString() === "1e+21"`), per RFC 9110's
    // `delta-seconds = 1*DIGIT` grammar.
    const seconds = Math.ceil(value).toString();
    return /^\d+$/.test(seconds) ? seconds : undefined;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toUTCString();
  }
  if (typeof value === 'string') {
    return value.trim() === '' ? undefined : value;
  }
  return undefined;
}
