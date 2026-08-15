import { HttpException, HttpStatus } from '@nestjs/common';
import * as fc from 'fast-check';
import { ProblemDetailsException } from '../../src/exception/problem-details.exception';
import {
  STANDARD_MEMBERS,
  caughtBody,
  httpStatus,
  jsonValue,
  makeFilter,
} from '../support/problem-harness';

/** Recursively replace -0 with 0, matching JSON's lack of a negative zero. */
function normalizeNegativeZero(value: unknown): unknown {
  if (Object.is(value, -0)) return 0;
  if (Array.isArray(value)) return value.map(normalizeNegativeZero);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, normalizeNegativeZero(v)]),
    );
  }
  return value;
}

/**
 * RFC 9457 §3.2 "Extension Members":
 *
 *   Problem type definitions MAY extend the problem details object with
 *   additional members that are specific to that problem type.
 *
 * Note: §4's advice that extension names SHOULD start with a letter and be
 * three or more characters is guidance for authors *defining* problem types,
 * not a validation rule a generic filter must enforce. It is therefore not
 * asserted here.
 */
describe('RFC 9457 §3.2 — extension members', () => {
  afterEach(() => jest.clearAllMocks());

  it('MUST forward the documented out-of-credit extensions (§3 example)', () => {
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

    expect(body).toEqual({
      type: 'https://example.com/probs/out-of-credit',
      title: 'You do not have enough credit.',
      status: HttpStatus.FORBIDDEN,
      detail: 'Your current balance is 30, but that costs 50.',
      instance: '/account/12345/msgs/abc',
      balance: 30,
      accounts: ['/account/12345', '/account/67890'],
    });
  });

  it('MUST forward the documented validation-error errors extension (§3 example)', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new HttpException(
        {
          message: 'Your request is not valid.',
          errors: [
            { detail: 'must be a positive integer', pointer: '#/age' },
            {
              detail: "must be 'green', 'red' or 'blue'",
              pointer: '#/profile/color',
            },
          ],
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      ),
    );

    expect(body.errors).toEqual([
      { detail: 'must be a positive integer', pointer: '#/age' },
      {
        detail: "must be 'green', 'red' or 'blue'",
        pointer: '#/profile/color',
      },
    ]);
  });

  it('MUST preserve arbitrary JSON extension values unchanged', () => {
    fc.assert(
      fc.property(
        httpStatus,
        fc.string(),
        // Any JSON-representable value: primitives, null, nested arrays/objects.
        jsonValue,
        (status, title, extValue) => {
          jest.clearAllMocks();
          const f = makeFilter();
          const body = caughtBody(
            f,
            new ProblemDetailsException({
              status,
              title,
              extension: extValue,
            }),
          );

          expect(Object.prototype.hasOwnProperty.call(body, 'extension')).toBe(
            true,
          );
          expect((body as Record<string, unknown>).extension).toEqual(extValue);
        },
      ),
    );
  });

  it.each([
    ['a null', null],
    ['a false boolean', false],
    ['a zero', 0],
    ['an empty string', ''],
    ['an empty array', []],
    ['an empty object', {}],
  ])(
    'MUST preserve %s extension value rather than dropping it',
    (_l, value) => {
      const f = makeFilter();
      const body = caughtBody(
        f,
        new ProblemDetailsException({
          status: HttpStatus.BAD_REQUEST,
          title: 'Bad Request',
          extension: value,
        }),
      );

      // Falsy-but-valid JSON values must not be silently discarded. Unlike the
      // five standard members, RFC 9457 places no type constraint on extensions,
      // so `null` is a legitimate extension value.
      expect(Object.prototype.hasOwnProperty.call(body, 'extension')).toBe(
        true,
      );
      expect((body as Record<string, unknown>).extension).toEqual(value);
    },
  );

  it('MUST preserve an arbitrary set of extension members simultaneously', () => {
    fc.assert(
      fc.property(
        httpStatus,
        fc.string(),
        // A whole dictionary of extensions with arbitrary JSON values, keyed by
        // names that cannot collide with the five standard members.
        fc.dictionary(fc.stringMatching(/^ext_[a-z0-9_]{1,8}$/), jsonValue, {
          minKeys: 1,
          maxKeys: 8,
        }),
        (status, title, extensions) => {
          jest.clearAllMocks();
          const f = makeFilter();
          const body = caughtBody(
            f,
            new ProblemDetailsException({
              status,
              title,
              ...extensions,
            }),
          );

          for (const [key, value] of Object.entries(extensions)) {
            expect(Object.prototype.hasOwnProperty.call(body, key)).toBe(true);
            expect((body as Record<string, unknown>)[key]).toEqual(value);
          }
          // Standard members must remain intact alongside them.
          expect(typeof body.type).toBe('string');
          expect(typeof body.title).toBe('string');
          expect(body.status).toBe(status);
        },
      ),
    );
  });

  it('MUST preserve extension members through a JSON round-trip', () => {
    fc.assert(
      fc.property(
        httpStatus,
        fc.string(),
        jsonValue,
        (status, title, value) => {
          jest.clearAllMocks();
          const f = makeFilter();
          const body = caughtBody(
            f,
            new ProblemDetailsException({
              status,
              title,
              ext_value: value,
            }),
          );

          // `JSON.stringify(-0) === "0"` — JSON itself has no negative zero,
          // so round-tripping legitimately normalizes -0 to 0 on both sides
          // before comparing. That's a property of JSON, not something the
          // library could preserve.
          const roundTripped = JSON.parse(JSON.stringify(body));
          expect(normalizeNegativeZero(roundTripped.ext_value)).toEqual(
            normalizeNegativeZero(value),
          );
        },
      ),
    );
  });

  it('MUST preserve deeply nested extension structures', () => {
    const nested = {
      level1: { level2: { level3: [1, 'two', null, { four: true }] } },
    };
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.BAD_REQUEST,
        title: 'Bad Request',
        context: nested,
      }),
    );

    expect((body as Record<string, unknown>).context).toEqual(nested);
  });

  it('MUST NOT let an extension member overwrite a standard member', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new HttpException(
        {
          message: 'Real title',
          error: {
            type: 'real-type',
            // Hostile extensions attempting to shadow standard members.
            status: 999,
            title: 'spoofed title',
          },
        },
        HttpStatus.BAD_REQUEST,
      ),
    );

    expect(body.status).toBe(HttpStatus.BAD_REQUEST);
    expect(body.title).toBe('Real title');
    expect(body.type).toBe('real-type');
  });

  it('emits no extension members when the caller supplies none', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new ProblemDetailsException({
        status: HttpStatus.BAD_REQUEST,
        title: 'Bad Request',
      }),
    );

    const extensions = Object.keys(body).filter(
      (k) => !(STANDARD_MEMBERS as readonly string[]).includes(k),
    );
    expect(extensions).toEqual([]);
  });

  /**
   * NOT APPLICABLE — consumer-side requirement.
   *
   * §3.2: "Clients consuming problem details MUST ignore any such extensions
   * that they don't recognize."
   *
   * This package is a *producer* (a NestJS exception filter that emits problem
   * details); it never parses them. The requirement is therefore out of scope
   * and cannot be satisfied or violated here. The same applies to:
   *
   *   §3.1.1  "Consumers MUST use the type URI as the primary identifier"
   *   §3.1.1  "consumers SHOULD NOT automatically dereference the type URI"
   *   §3.1.4  "Consumers SHOULD NOT parse the detail member for information"
   *   §3.1    "If a member's value type does not match, the member MUST be
   *            ignored" — the *consumer* half of this rule
   *
   * The producer half of §3.1 (never emitting a wrongly typed standard member)
   * is covered in tests/rfc9457/member-types.spec.ts.
   */
  it.todo(
    'N/A — consumers MUST ignore unrecognized extensions (this package is a producer)',
  );
});
