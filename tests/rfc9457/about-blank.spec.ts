import { STATUS_CODES } from 'http';
import { HttpException, HttpStatus } from '@nestjs/common';
import { caughtBody, makeFilter } from '../support/problem-harness';

/**
 * RFC 9457 §4.2.1 "about:blank":
 *
 *   The "about:blank" URI, when used as a problem type, indicates that the
 *   problem has no additional semantics beyond that of the HTTP status code.
 *
 *   When "about:blank" is used, the title SHOULD be the same as the recommended
 *   HTTP status phrase for that code (e.g., "Not Found" for 404, and so on),
 *   although it MAY be localized to suit client preferences.
 *
 * Note: "no additional semantics" constrains the *problem type*, not the
 * response body — `detail` remains legitimate alongside `about:blank`.
 */
describe('RFC 9457 §4.2.1 — about:blank', () => {
  afterEach(() => jest.clearAllMocks());

  it('is the default type when no explicit type is supplied', () => {
    const f = makeFilter({ strictRfcDefaults: true });
    const body = caughtBody(
      f,
      new HttpException('Oops', HttpStatus.BAD_REQUEST),
    );

    expect(body.type).toBe('about:blank');
  });

  // Node's http.STATUS_CODES is a small, fixed, well-known table (~60 entries)
  // — enumerating it exhaustively via `it.each` is both readable and, unlike a
  // sampled property test, guaranteed to cover every registered status code.
  it.each(Object.entries(STATUS_CODES))(
    'title SHOULD equal the recommended HTTP status phrase — %s → %p',
    (status, phrase) => {
      const f = makeFilter({ strictRfcDefaults: true });
      const body = caughtBody(f, new HttpException('Oops', Number(status)));

      expect(body.type).toBe('about:blank');
      expect(body.title).toBe(phrase);
    },
  );

  it('MAY still carry occurrence-specific detail alongside about:blank', () => {
    const f = makeFilter({ strictRfcDefaults: true });
    const body = caughtBody(
      f,
      new HttpException('The email field is invalid.', HttpStatus.BAD_REQUEST),
    );

    expect(body.type).toBe('about:blank');
    expect(body.title).toBe('Bad Request');
    // `about:blank` says nothing about omitting detail — it remains valid.
    expect(body.detail).toBe('The email field is invalid.');
  });
});
