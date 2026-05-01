import { STATUS_CODES } from 'http';

import { DEFAULT_HTTP_ERRORS, DEFAULT_PROBLEM_TYPE } from './filter/constants';

/**
 * Resolve the human-readable title for a Problem Details response.
 *
 * Mirrors the runtime logic in {@link HttpExceptionFilter} so that OpenAPI
 * documentation and the actual wire format stay aligned.
 *
 * @param title   Caller-provided title (e.g. from `ProblemDetailsException`).
 * @param status  HTTP status code.
 * @returns       `title` if given, otherwise the standard HTTP reason phrase,
 *                or `'Error'` as the ultimate fallback.
 */
export function resolveProblemTitle(
  title: string | undefined,
  status: number,
): string {
  return title ?? STATUS_CODES[status] ?? 'Error';
}

/**
 * Resolve the RFC 9457 `type` value for a Problem Details response.
 *
 * Mirrors the runtime logic in {@link HttpExceptionFilter} up to (but not
 * including) `BASE_PROBLEMS_URI` resolution, which is a runtime concern.
 *
 * @param type           Caller-provided type (e.g. from `ProblemDetailsException`).
 * @param status         HTTP status code.
 * @param defaultErrors  Status-to-type map. Defaults to the built-in
 *                       {@link DEFAULT_HTTP_ERRORS} used by the filter.
 * @returns              `type` if given, otherwise the mapped default type for
 *                       the status, or `'about:blank'` (RFC 9457 §4.2.1).
 */
export function resolveProblemType(
  type: string | undefined,
  status: number,
  defaultErrors: Record<number, string> = DEFAULT_HTTP_ERRORS,
): string {
  return type ?? defaultErrors[status] ?? DEFAULT_PROBLEM_TYPE;
}

/**
 * Resolve an absolute or relative problem type URI against a base URI.
 *
 * Per RFC 3986 reference resolution via WHATWG URL:
 * - absolute references (`https://…`, `urn:…`, `about:blank`) ignore the base
 *   — satisfying RFC 9457 §4.2.1 ("about:blank" stays bare).
 * - relative references join cleanly without producing `//`.
 *
 * @param type     The resolved type value (from {@link resolveProblemType}).
 * @param baseUri  Optional base URI configured in {@link HttpExceptionFilter}.
 * @returns        Absolute URI if `baseUri` is provided and `type` is relative,
 *                 otherwise the raw `type`.
 */
export function resolveProblemUri(type: string, baseUri?: string): string {
  if (!baseUri) return type;
  try {
    const base = baseUri.endsWith('/') ? baseUri : `${baseUri}/`;
    return new URL(type, base).toString();
  } catch {
    return type;
  }
}
