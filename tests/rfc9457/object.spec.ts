import { HttpException, HttpStatus } from '@nestjs/common';
import { ProblemDetailsException } from '../../src/exception/problem-details.exception';
import { caughtBody, makeFilter } from '../support/problem-harness';

/**
 * RFC 9457 §3 "The Problem Details JSON Object":
 *
 *   The canonical model for problem details is a JSON object. When serialized
 *   in a JSON document, that format is identified with the
 *   "application/problem+json" media type.
 *
 * The document must therefore be a JSON *object* (not an array or scalar) and
 * must survive JSON serialization without losing or corrupting members.
 */
describe('RFC 9457 §3 — the problem details object', () => {
  afterEach(() => jest.clearAllMocks());

  it('MUST be a JSON object', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new HttpException('Oops', HttpStatus.BAD_REQUEST),
    );

    expect(typeof body).toBe('object');
    expect(body).not.toBeNull();
    expect(Array.isArray(body)).toBe(false);
  });

  it('MUST be losslessly representable as JSON', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        type: 'https://example.com/probs/out-of-credit',
        title: 'You do not have enough credit.',
        status: HttpStatus.FORBIDDEN,
        detail: 'Your current balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
        balance: 30,
        accounts: ['/account/12345', '/account/67890'],
      }),
    );

    const roundTripped = JSON.parse(JSON.stringify(body));
    expect(roundTripped).toEqual(body);
  });

  // MUST NOT contain members that vanish under JSON serialization
  it('MUST NOT emit undefined-valued members that would vanish under JSON serialization', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new HttpException('Oops', HttpStatus.BAD_REQUEST),
    );

    // `undefined`-valued members are dropped by JSON.stringify, which would
    // make the emitted document differ from the in-memory object.
    const roundTripped = JSON.parse(JSON.stringify(body));
    expect(Object.keys(roundTripped).sort()).toEqual(Object.keys(body).sort());
    expect(roundTripped).not.toHaveProperty('detail');
    expect(roundTripped).not.toHaveProperty('instance');
  });

  it('carries the three members this library always emits', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new HttpException('Oops', HttpStatus.BAD_REQUEST),
    );

    expect(body).toHaveProperty('type');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status');
  });
});
