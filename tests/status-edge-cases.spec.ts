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

  // TODO #52: `JSON.stringify(NaN)` produces `null`, so the `status` member
  // is no longer a number on the wire. This should be resolved by the
  // runtime type validation work.
  it.skip('does not serialize NaN as a JSON number', () => {
    const f = makeFilter();
    const body = caughtBody(f, new HttpException('Oops', Number.NaN));

    const roundTripped = JSON.parse(JSON.stringify(body));
    expect(typeof roundTripped.status).toBe('number');
  });

  it('passes NaN through to both the body and the HTTP reply', () => {
    const f = makeFilter();
    const ex = new HttpException('Oops', Number.NaN);

    const { body, status: replied } = caughtResponse(f, ex);

    expect(Object.is(body.status, replied)).toBe(true);
  });
});
