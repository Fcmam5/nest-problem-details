import { HttpStatus } from '@nestjs/common';
import { ProblemDetailsException } from '../../src/exception/problem-details.exception';
import {
  URI_REFERENCES,
  caughtBody,
  makeFilter,
} from '../support/problem-harness';

/**
 * RFC 9457 §3.1.5 "instance":
 *
 *   The "instance" member is a JSON string containing a URI reference that
 *   identifies the specific occurrence of the problem.
 *
 * As with `type`, the RFC describes relative-reference resolution as a
 * *consumer* concern; a producer is not required to absolutize it.
 */
describe('RFC 9457 §3.1.5 — instance', () => {
  afterEach(() => jest.clearAllMocks());

  it('MUST be a JSON string when present', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        title: 'You do not have enough credit.',
        instance: '/account/12345/msgs/abc',
      }),
    );

    expect(typeof body.instance).toBe('string');
    expect(body.instance).toBe('/account/12345/msgs/abc');
  });

  it.each(URI_REFERENCES)(
    'MUST preserve the URI reference %p verbatim',
    (instance) => {
      const f = makeFilter();
      const body = caughtBody(
        f,
        new ProblemDetailsException({
          status: HttpStatus.BAD_REQUEST,
          title: 'Bad Request',
          instance,
        }),
      );

      expect(body.instance).toBe(instance);
    },
  );

  it('is optional — MUST be absent when the caller supplies none', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.BAD_REQUEST,
        title: 'Bad Request',
      }),
    );

    expect(body).not.toHaveProperty('instance');
  });

  it('MUST ignore an instance whose value type is not a string (§3.1)', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.BAD_REQUEST,
        title: 'Bad Request',
        instance: null as unknown as string,
      }),
    );

    // §3.1: a member whose value type does not match MUST be ignored —
    // "processing will continue as if the member had not been present".
    // `instance` is defined as a JSON string, so `null` must not be emitted.
    expect(body).not.toHaveProperty('instance');
  });
});
