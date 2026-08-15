import { HttpException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as fc from 'fast-check';
import { HttpExceptionFilter } from '../../src/filter/http-exception.filter';
import { IProblemDetail } from '../../src/filter/interfaces';

/**
 * Shared harness for exercising `HttpExceptionFilter` against a mocked HTTP
 * adapter, plus fast-check generators for RFC-relevant input spaces.
 */

export const mockGetResponse = jest.fn().mockImplementation(() => ({}));

export const mockHttpAdapter = {
  setHeader: jest.fn().mockReturnThis(),
  reply: jest.fn().mockReturnThis(),
} as unknown as HttpAdapterHost['httpAdapter'];

export const mockHttpAdapterHost = {
  get httpAdapter() {
    return mockHttpAdapter;
  },
} as unknown as HttpAdapterHost;

export const mockArgumentsHost = {
  switchToHttp: jest.fn().mockImplementation(() => ({
    getResponse: mockGetResponse,
    getRequest: jest.fn(),
  })),
  getArgByIndex: jest.fn(),
  getArgs: jest.fn(),
  getType: jest.fn(),
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
};

export interface FilterOptions {
  baseUri?: string;
  strictRfcDefaults?: boolean;
}

export function makeFilter({
  baseUri = '',
  strictRfcDefaults = false,
}: FilterOptions = {}): HttpExceptionFilter {
  return new HttpExceptionFilter(
    mockHttpAdapterHost,
    baseUri,
    undefined,
    undefined,
    strictRfcDefaults,
  );
}

/** Catch an exception and return the JSON body handed to `reply()`. */
export function caughtBody(
  f: HttpExceptionFilter,
  ex: HttpException,
): IProblemDetail {
  f.catch(ex, mockArgumentsHost);
  const replyMock = mockHttpAdapter.reply as jest.Mock;
  const calls = replyMock.mock.calls;
  return calls[calls.length - 1]?.[1] as IProblemDetail;
}

/** Catch an exception and return the HTTP status passed to `reply()`. */
export function caughtStatus(
  f: HttpExceptionFilter,
  ex: HttpException,
): number {
  f.catch(ex, mockArgumentsHost);
  const replyMock = mockHttpAdapter.reply as jest.Mock;
  const calls = replyMock.mock.calls;
  return calls[calls.length - 1]?.[2] as number;
}

/** Catch an exception once and return both the JSON body and HTTP status. */
export function caughtResponse(
  f: HttpExceptionFilter,
  ex: HttpException,
): { body: IProblemDetail; status: number } {
  f.catch(ex, mockArgumentsHost);
  const replyMock = mockHttpAdapter.reply as jest.Mock;
  const calls = replyMock.mock.calls;
  const last = calls[calls.length - 1];
  return {
    body: last?.[1] as IProblemDetail,
    status: last?.[2] as number,
  };
}

/** Collapse all `setHeader()` calls into a header map. */
export function caughtHeaders(): Record<string, unknown> {
  const setHeaderMock = mockHttpAdapter.setHeader as jest.Mock;
  const headers: Record<string, unknown> = {};
  for (const call of setHeaderMock.mock.calls) {
    headers[call[1] as string] = call[2];
  }
  return headers;
}

/**
 * RFC 9457 §3.1.1 permits any URI *reference* for `type` — not just HTTP(S)
 * URLs. This covers absolute URIs across schemes, non-resolvable URIs, and
 * every flavour of relative reference described in RFC 3986 §4.1.
 */
export const URI_REFERENCES = [
  // Absolute, resolvable
  'https://example.com/problems/out-of-credit',
  'http://example.com/foo',
  // Absolute, non-resolvable
  'about:blank',
  'urn:example:problem',
  'tag:example.com,2026:OutOfLuck',
  // Relative references (RFC 3986 §4.1)
  '/problems/foo',
  'foo',
  '../problems/foo',
  './foo',
  '?problem=foo',
  '#problem',
] as const;

/** Valid HTTP status codes for problem responses. */
export const httpStatus = fc.integer({ min: 100, max: 599 });

/**
 * Arbitrary JSON-compatible value. Preferred over `fc.anything()`, which can
 * emit `Date`, `Map`, `BigInt`, `undefined` and other non-JSON values.
 */
export const jsonValue = fc.jsonValue();

/**
 * Full-Unicode text, including astral-plane code points, combining marks and
 * grapheme clusters. `title` and `detail` are free-form human-readable strings
 * (RFC 9457 §3.1.3 / §3.1.4) and may be localized, so they must survive
 * verbatim.
 */
export const unicodeText = fc.string({ unit: 'grapheme' });

/** The five standard members defined by RFC 9457 §3.1. */
export const STANDARD_MEMBERS = [
  'type',
  'status',
  'title',
  'detail',
  'instance',
] as const;
