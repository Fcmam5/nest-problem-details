import { HttpException } from '@nestjs/common';
import { RetryAfterValue } from './retry-after';

/**
 * Input accepted by `ProblemDetailsException`. Mirrors `IProblemDetail` but
 * makes `type` optional so the filter can resolve a default `type` from its
 * status-to-type map (or fall back to `about:blank`, per RFC 9457 §4.2.1).
 *
 * `retryAfter` is conveyed as the `Retry-After` HTTP response header
 * (RFC 9110 §10.2.3), not as a body field — the filter sets the header and
 * strips the value from the JSON payload.
 */
export interface ProblemDetailsInput {
  status: number;
  title: string;
  type?: string;
  detail?: string;
  instance?: string;
  retryAfter?: RetryAfterValue;
  [key: string]: unknown;
}

/**
 * Exception that accepts an RFC 9457 Problem Details payload directly.
 *
 * Eliminates the need to construct the nested `{ message, error: { ... } }`
 * shape required by `HttpException` when used with `HttpExceptionFilter`.
 *
 * @example
 * throw new ProblemDetailsException({
 *   type: 'out-of-credit',
 *   title: 'You do not have enough credit.',
 *   status: 403,
 *   detail: 'Your balance is 30, but that costs 50.',
 *   balance: 30,
 * });
 *
 * @example
 * // Rate limiting with `Retry-After` (RFC 9110 §10.2.3):
 * throw new ProblemDetailsException({
 *   type: 'rate-limit-exceeded',
 *   title: 'Too Many Requests',
 *   status: 429,
 *   detail: 'Quota exceeded.',
 *   retryAfter: 3600, // seconds, or Date, or pre-formatted string
 * });
 */
export class ProblemDetailsException extends HttpException {
  readonly retryAfter?: RetryAfterValue;

  constructor(problem: ProblemDetailsInput) {
    const { status, title, type, detail, retryAfter, ...extras } = problem;

    const error: Record<string, unknown> = { ...extras };
    if (type !== undefined) error.type = type;
    if (detail !== undefined) error.detail = detail;

    super({ message: title, error }, status);

    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }
}
