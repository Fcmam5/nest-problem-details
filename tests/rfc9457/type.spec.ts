import { HttpException, HttpStatus } from '@nestjs/common';
import {
  URI_REFERENCES,
  caughtBody,
  makeFilter,
} from '../support/problem-harness';

/**
 * RFC 9457 §3.1.1 "type":
 *
 *   The "type" member is a JSON string containing a URI reference that
 *   identifies the problem type. ... When this member is not present, its
 *   value is assumed to be "about:blank".
 *
 * Note: the RFC describes how *consumers* resolve relative references against
 * the document's base URI. It places no requirement on a producer to rewrite
 * a relative reference into an absolute URI, so that is not asserted here.
 */
describe('RFC 9457 §3.1.1 — type', () => {
  afterEach(() => jest.clearAllMocks());

  it('MUST be a JSON string', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new HttpException('Oops', HttpStatus.BAD_REQUEST),
    );

    expect(typeof body.type).toBe('string');
  });

  it('MUST default to about:blank when no problem type is supplied', () => {
    const f = makeFilter({ strictRfcDefaults: true });
    const body = caughtBody(
      f,
      new HttpException('Oops', HttpStatus.BAD_REQUEST),
    );

    expect(body.type).toBe('about:blank');
  });

  // The set covers every shape of URI reference RFC 3986 §4.1 permits:
  // absolute + resolvable, absolute + non-resolvable, and every flavour of
  // relative reference. It's small and finite, so an explicit table is more
  // legible than sampling it via fast-check.
  it.each(URI_REFERENCES)(
    'MUST preserve the URI reference %p verbatim, regardless of shape',
    (type) => {
      const f = makeFilter();
      const body = caughtBody(
        f,
        new HttpException(
          { message: 'Oops', error: { type } },
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(body.type).toBe(type);
    },
  );

  it.each([
    'https://example.com/problems/out-of-credit',
    'urn:example:problem',
    'about:blank',
  ])(
    'MUST preserve an absolute URI %p unchanged even when a base URI is configured',
    (type) => {
      const f = makeFilter({ baseUri: 'https://api.example.org/problems' });
      const body = caughtBody(
        f,
        new HttpException(
          { message: 'Oops', error: { type } },
          HttpStatus.BAD_REQUEST,
        ),
      );

      expect(body.type).toBe(type);
    },
  );

  // A recognized status (mapped to a slug) and an unrecognized one (falls back
  // to "about:blank") are the only two code paths here — both must yield a
  // non-empty string, so two examples fully cover the branch.
  it.each([HttpStatus.NOT_FOUND, 452])(
    'MUST always emit a non-empty string type, for status %i',
    (status) => {
      const f = makeFilter();
      const body = caughtBody(f, new HttpException('Oops', status));

      expect(typeof body.type).toBe('string');
      expect(body.type.length).toBeGreaterThan(0);
    },
  );
});
