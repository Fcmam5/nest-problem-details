import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from '../../src/filter/http-exception.filter';
import {
  caughtBody,
  makeFilter,
  mockHttpAdapterHost,
} from '../support/problem-harness';

/**
 * RFC 9457 §5 "Security Considerations":
 *
 *   Problem details are not a debugging tool for the underlying implementation
 *   ... the risk of exposing attack vectors by exposing implementation
 *   internals through error messages.
 */
describe('RFC 9457 §5 — security considerations', () => {
  afterEach(() => jest.clearAllMocks());

  it('MUST NOT leak the exception stack trace into the response body', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new HttpException('Oops', HttpStatus.INTERNAL_SERVER_ERROR),
    );

    expect(body).not.toHaveProperty('stack');
    expect(JSON.stringify(body)).not.toContain('at Object.');
  });

  it('MUST NOT leak HttpException/Error internals into the response body', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new HttpException('Oops', HttpStatus.INTERNAL_SERVER_ERROR),
    );

    for (const internal of [
      'stack',
      'message',
      'name',
      'response',
      'options',
    ]) {
      expect(body).not.toHaveProperty(internal);
    }
  });

  it('MUST NOT emit the NestJS statusCode envelope field', () => {
    const f = makeFilter();
    const body = caughtBody(
      f,
      new HttpException(
        { message: 'Oops', error: 'Boom', statusCode: 500 },
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );

    // `statusCode` is a NestJS implementation detail; RFC 9457 uses `status`.
    expect(body).not.toHaveProperty('statusCode');
    expect(body.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('supports suppressing detail so internals need not reach the client', () => {
    const withSuppression = new HttpExceptionFilter(
      mockHttpAdapterHost,
      '',
      undefined,
      ({ status }) => status >= 500,
    );

    const body = caughtBody(
      withSuppression,
      new HttpException(
        {
          message: 'Something went wrong',
          error: 'Database connection timeout at 10.0.0.5:5432',
          statusCode: 500,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );

    expect(body).not.toHaveProperty('detail');
    expect(JSON.stringify(body)).not.toContain('10.0.0.5');
  });
});
