import { HttpException as NestHttpException } from '@nestjs/common';

/**
 * As specified in RFC 9457 §3 (formerly RFC 7807 §3.1).
 * https://datatracker.ietf.org/doc/html/rfc9457#section-3
 * https://datatracker.ietf.org/doc/html/rfc7807#section-3.1
 */
export interface IProblemDetail {
  status: number;
  title: string;
  type: string;
  detail?: string;
  instance?: string;
  /** Stable, machine-readable error code (RFC 9457 §3 extension member). */
  errorCode?: string;
  [key: string]: unknown;
}

export interface IErrorDetail {
  message: string;
  error?: {
    type?: string;
    instance?: string;
    detail?: string;
    [key: string]: unknown;
  };
}

/**
 * Context passed to the `suppressDetail` callback, describing the current
 * Problem Details response before it is sent to the client.
 */
export interface SuppressDetailContext {
  status: number;
  type: string;
  exception: NestHttpException;
}

/**
 * Controls whether the `detail` field is omitted from the Problem Details
 * response.
 *
 * - Pass `true` to suppress `detail` on every response.
 * - Pass `false` (or omit) to never suppress.
 * - Pass a callback to suppress conditionally; return `true` to omit.
 *
 * @example
 * // Always suppress
 * suppressDetail: true
 *
 * @example
 * // Suppress only for 5xx errors
 * suppressDetail: ({ status }) => status >= 500
 */
export type SuppressDetail =
  boolean | ((ctx: SuppressDetailContext) => boolean);

/**
 * Shape of the payload returned by `HttpException.getResponse()` when not a
 * plain string. Mirrors NestJS's internal exception shape.
 *
 * `message` may be a `string[]` when Nest's default `ValidationPipe` is used.
 * `errors` carries structured validation errors when set by the caller:
 * either a `Record<string, string[]>` field-map or a RFC 9457 pointer array.
 */
export interface IExceptionResponse {
  message: string | string[];
  error?: string | IErrorDetail['error'];
  errors?: unknown;
  statusCode: number;
}
