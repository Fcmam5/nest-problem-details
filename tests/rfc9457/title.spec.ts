import { HttpException, HttpStatus } from '@nestjs/common';
import * as fc from 'fast-check';
import { ProblemDetailsException } from '../../src/exception/problem-details.exception';
import {
  caughtBody,
  httpStatus,
  makeFilter,
  unicodeText,
} from '../support/problem-harness';

/**
 * RFC 9457 §3.1.3 "title":
 *
 *   The "title" member is a JSON string containing a short, human-readable
 *   summary of the problem type. It SHOULD NOT change from occurrence to
 *   occurrence of the problem, except for localization.
 *
 * Title stability is a property of a *problem type definition*, not something a
 * generic filter can enforce — the caller chooses the title. What is testable
 * here is that the filter does not mutate or synthesize an unstable title.
 */
describe('RFC 9457 §3.1.3 — title', () => {
  afterEach(() => jest.clearAllMocks());

  it('MUST be a JSON string', () => {
    const f = makeFilter();
    const body = caughtBody(f, new HttpException('Oops', HttpStatus.NOT_FOUND));

    expect(typeof body.title).toBe('string');
  });

  it('MUST emit the caller-supplied title verbatim', () => {
    fc.assert(
      fc.property(httpStatus, fc.string(), (status, title) => {
        jest.clearAllMocks();
        const f = makeFilter();
        const body = caughtBody(
          f,
          new ProblemDetailsException({ status, title }),
        );

        expect(body.title).toBe(title);
      }),
    );
  });

  it('MUST preserve full-Unicode titles byte-for-byte, including through JSON', () => {
    // §3.1.3 titles are human-readable and MAY be localized, so emoji, RTL
    // scripts, combining marks and astral-plane code points must all survive.
    fc.assert(
      fc.property(httpStatus, unicodeText, (status, title) => {
        jest.clearAllMocks();
        const f = makeFilter();
        const body = caughtBody(
          f,
          new ProblemDetailsException({ status, title }),
        );

        expect(body.title).toBe(title);
        expect(JSON.parse(JSON.stringify(body)).title).toBe(title);
      }),
    );
  });

  it.each([
    ['emoji', 'Payment failed 💳'],
    ['RTL script', 'لم يتم العثور على التنين'],
    ['CJK', '見つかりません'],
    ['combining marks', 'Ame\u0301lie not found'],
    ['zero-width joiner', 'family: 👨‍👩‍👧‍👦'],
    ['newlines and tabs', 'line one\nline two\ttabbed'],
  ])('MUST preserve a %s title exactly', (_label, title) => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({ status: HttpStatus.NOT_FOUND, title }),
    );

    expect(body.title).toBe(title);
    expect(JSON.parse(JSON.stringify(body)).title).toBe(title);
  });

  it('SHOULD NOT change across distinct occurrences of the same problem type', () => {
    const f = makeFilter();

    // Two independent occurrences of the same problem type, differing only in
    // occurrence-specific data (detail / instance).
    const first = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        type: 'out-of-credit',
        title: 'You do not have enough credit.',
        detail: 'Your balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
      }),
    );
    const second = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        type: 'out-of-credit',
        title: 'You do not have enough credit.',
        detail: 'Your balance is 0, but that costs 10.',
        instance: '/account/67890/msgs/xyz',
      }),
    );

    expect(first.type).toBe(second.type);
    expect(first.title).toBe(second.title);
    expect(first.detail).not.toBe(second.detail);
  });
});
