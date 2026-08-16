import { HttpException } from '@nestjs/common';
import {
  caughtBody,
  caughtResponse,
  makeFilter,
} from './support/problem-harness';

/**
 * Library edge cases for non-HTTP / invalid `status` inputs.
 *
 * These are NOT RFC 9457 normative requirements. They document how the filter
 * currently behaves for status values that are not valid HTTP status codes, so
 * a rejection / normalization contract can be decided and enforced separately.
 */
describe('HttpExceptionFilter — status edge cases', () => {
  afterEach(() => jest.clearAllMocks());

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['below the HTTP range', 99],
    ['above the HTTP range', 1000],
    ['fractional', 2.5],
  ])(
    'passes the %s status (%p) through to both the body and the HTTP reply',
    (_label, status) => {
      const f = makeFilter();
      const ex = new HttpException('Oops', status);

      const { body, status: replied } = caughtResponse(f, ex);

      expect(body.status).toBe(status);
      expect(replied).toBe(status);
      expect(Object.is(body.status, replied)).toBe(true);
    },
  );

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['below the HTTP range', 99],
    ['above the HTTP range', 1000],
    ['fractional', 2.5],
  ])('serializes the %s status (%p) as a JSON number', (_label, status) => {
    const f = makeFilter();
    const body = caughtBody(f, new HttpException('Oops', status));

    const roundTripped = JSON.parse(JSON.stringify(body));
    expect(typeof roundTripped.status).toBe('number');
  });

  // Non-finite numbers pass a `typeof === 'number'` check but serialize as
  // `null`, so they cannot be passed through. They degrade to 500 instead.
  it.each([
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    // Non-numeric statuses can only arrive from untyped callers.
    ['a numeric string', '400' as unknown as number],
    ['a non-numeric string', 'oops' as unknown as number],
    ['null', null as unknown as number],
    ['undefined', undefined as unknown as number],
  ])('falls back to 500 when status is %s', (_label, status) => {
    const f = makeFilter();

    const { body, status: replied } = caughtResponse(
      f,
      new HttpException('Oops', status),
    );

    expect(body.status).toBe(500);
    expect(replied).toBe(500);
    expect(body.status).toBe(replied);
  });

  it('serializes a non-finite status as a JSON number, not null', () => {
    const f = makeFilter();
    const body = caughtBody(f, new HttpException('Oops', Number.NaN));

    const roundTripped = JSON.parse(JSON.stringify(body));
    expect(typeof roundTripped.status).toBe('number');
    expect(roundTripped.status).not.toBeNull();
  });
});
