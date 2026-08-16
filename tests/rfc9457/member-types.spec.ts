import { HttpStatus } from '@nestjs/common';
import { ProblemDetailsException } from '../../src/exception/problem-details.exception';
import { caughtBody, makeFilter } from '../support/problem-harness';

/**
 * RFC 9457 §3.1:
 *
 *   Problem detail objects can have the following members. If a member's value
 *   type does not match the specified type, the member MUST be ignored -- i.e.,
 *   processing will continue as if the member had not been present.
 *
 * The declared types are:
 *   type     — JSON string (URI reference)
 *   status   — JSON number
 *   title    — JSON string
 *   detail   — JSON string
 *   instance — JSON string (URI reference)
 *
 * TypeScript cannot prevent malformed values at runtime (callers may be
 * untyped JS, or values may come from parsed input), so a conformant generator
 * must not emit a standard member holding a value of the wrong type.
 */
describe('RFC 9457 §3.1 — member value types', () => {
  afterEach(() => jest.clearAllMocks());

  const malformed = [
    ['null', null],
    ['a number', 42],
    ['a boolean', true],
    ['an object', { nested: 'value' }],
    ['an array', ['a', 'b']],
  ] as const;

  describe.each(malformed)('when detail is %s', (_label, value) => {
    it('MUST be ignored (i.e., not emitted) per §3.1', () => {
      const f = makeFilter();
      const body = caughtBody(
        f,
        new ProblemDetailsException({
          status: HttpStatus.BAD_REQUEST,
          title: 'Bad Request',
          detail: value as unknown as string,
        }),
      );

      expect(body).not.toHaveProperty('detail');
    });
  });

  describe.each(malformed)('when instance is %s', (_label, value) => {
    it('MUST be ignored (i.e., not emitted) per §3.1', () => {
      const f = makeFilter();
      const body = caughtBody(
        f,
        new ProblemDetailsException({
          status: HttpStatus.BAD_REQUEST,
          title: 'Bad Request',
          instance: value as unknown as string,
        }),
      );

      expect(body).not.toHaveProperty('instance');
    });
  });

  it('MUST always emit type as a string, never a non-string', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.BAD_REQUEST,
        title: 'Bad Request',
        type: 42 as unknown as string,
      }),
    );

    expect(typeof body.type).toBe('string');
  });

  it('MUST always emit title as a string, never a non-string', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.BAD_REQUEST,
        title: 42 as unknown as string,
      }),
    );

    expect(typeof body.title).toBe('string');
  });

  it('MUST always emit status as a number, never a string', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: '400' as unknown as number,
        title: 'Bad Request',
      }),
    );

    expect(typeof body.status).toBe('number');
  });
});
