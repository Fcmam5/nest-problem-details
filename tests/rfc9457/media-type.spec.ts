import { HttpException, HttpStatus } from '@nestjs/common';
import {
  caughtHeaders,
  makeFilter,
  mockArgumentsHost,
} from '../support/problem-harness';
import { PROBLEM_CONTENT_TYPE } from '../../src/filter/constants';

/**
 * RFC 9457 §3: "The canonical model for problem details is a JSON object.
 * When serialized in a JSON document, that format is identified with the
 * 'application/problem+json' media type."
 */
describe('RFC 9457 §3 — media type', () => {
  afterEach(() => jest.clearAllMocks());

  it('MUST identify the response with the application/problem+json media type', () => {
    const f = makeFilter();
    f.catch(
      new HttpException('Oops', HttpStatus.BAD_REQUEST),
      mockArgumentsHost,
    );

    expect(caughtHeaders()['Content-Type']).toBe('application/problem+json');
  });

  it('exposes the media type as the library constant', () => {
    expect(PROBLEM_CONTENT_TYPE).toBe('application/problem+json');
  });
});
