import { HttpStatus } from '@nestjs/common';
import * as fc from 'fast-check';
import { ProblemDetailsException } from '../../src/exception/problem-details.exception';
import {
  caughtBody,
  httpStatus,
  makeFilter,
  unicodeText,
} from '../support/problem-harness';

/**
 * RFC 9457 §3.1.4 "detail":
 *
 *   The "detail" member is a JSON string containing a human-readable
 *   explanation specific to this occurrence of the problem.
 *
 * §3.1: "If a member's value type does not match the specified type, the member
 * MUST be ignored." `detail` is therefore a string *when present* — `null` is
 * not a valid value.
 */
describe('RFC 9457 §3.1.4 — detail', () => {
  afterEach(() => jest.clearAllMocks());

  it('MUST be a JSON string when present', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        title: 'You do not have enough credit.',
        detail: 'Your current balance is 30, but that costs 50.',
      }),
    );

    expect(typeof body.detail).toBe('string');
    expect(body.detail).toBe('Your current balance is 30, but that costs 50.');
  });

  it('MUST emit any caller-supplied string as detail', () => {
    fc.assert(
      fc.property(
        httpStatus,
        fc.string(),
        fc.string(),
        (status, title, detail) => {
          jest.clearAllMocks();
          const f = makeFilter();
          const body = caughtBody(
            f,
            new ProblemDetailsException({ status, title, detail }),
          );

          expect(typeof body.detail).toBe('string');
          expect(body.detail).toBe(detail);
        },
      ),
    );
  });

  it('MUST preserve full-Unicode details byte-for-byte, including through JSON', () => {
    // §3.1.4 detail is human-readable prose and MAY be localized.
    fc.assert(
      fc.property(
        httpStatus,
        unicodeText,
        unicodeText,
        (status, title, detail) => {
          jest.clearAllMocks();
          const f = makeFilter();
          const body = caughtBody(
            f,
            new ProblemDetailsException({ status, title, detail }),
          );

          expect(body.detail).toBe(detail);
          expect(JSON.parse(JSON.stringify(body)).detail).toBe(detail);
        },
      ),
    );
  });

  it('is optional — MUST be absent when the caller supplies none', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.BAD_REQUEST,
        title: 'Bad Request',
      }),
    );

    expect(body).not.toHaveProperty('detail');
  });

  it('MUST ignore a detail whose value type is not a string (§3.1)', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.BAD_REQUEST,
        title: 'Bad Request',
        detail: null as unknown as string,
      }),
    );

    // §3.1: a member whose value type does not match MUST be ignored —
    // "processing will continue as if the member had not been present".
    // `detail` is defined as a JSON string, so `null` must not be emitted.
    expect(body).not.toHaveProperty('detail');
  });
});
