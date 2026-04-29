import { HttpException } from '@nestjs/common';

/**
 * Input accepted by `ProblemDetailsException`. Mirrors `IProblemDetail` but
 * makes `type` optional so the filter can resolve a default `type` from its
 * status-to-type map (or fall back to `about:blank`, per RFC 9457 §4.2.1).
 */
export interface ProblemDetailsInput {
  status: number;
  title: string;
  type?: string;
  detail?: string;
  instance?: string;
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
 */
export class ProblemDetailsException extends HttpException {
  constructor(problem: ProblemDetailsInput) {
    const { status, title, type, detail, ...extras } = problem;

    const error: Record<string, unknown> = { ...extras };
    if (type !== undefined) error.type = type;
    if (detail !== undefined) error.detail = detail;

    super({ message: title, error }, status);
  }
}
