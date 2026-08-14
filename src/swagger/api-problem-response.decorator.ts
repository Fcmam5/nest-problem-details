import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { ApiResponseOptions, ApiResponseExamples } from '@nestjs/swagger';
import type {
  HeaderObject,
  ReferenceObject,
  SchemaObject,
} from './openapi-types';

import { formatRetryAfter, RetryAfterValue } from '../exception/retry-after';
import { PROBLEM_CONTENT_TYPE } from '../filter/constants';
import { IProblemDetail } from '../filter/interfaces';
import {
  resolveProblemTitle,
  resolveProblemType,
  resolveProblemUri,
} from '../resolvers';
import { PROBLEM_DETAILS_SCHEMA } from './problem-schema';

/**
 * Options accepted by {@link ApiProblemResponse}.
 */
export interface ApiProblemResponseOptions {
  /** HTTP status code for this problem response (e.g. `404`, `429`). */
  status: number;
  /**
   * RFC 9457 `type` value emitted in the OpenAPI example. If you configure a
   * `BASE_PROBLEMS_URI` in the filter, also pass it as {@link baseUri} so the
   * documented example matches the wire format.
   */
  type?: string;
  /**
   * Human-readable summary used both as the `description` of the OpenAPI
   * response and as the example `title`. Falls back to the standard HTTP
   * reason phrase for `status`.
   */
  title?: string;
  /**
   * Overrides the OpenAPI response `description`. Defaults to {@link title}
   * (or the standard reason phrase).
   */
  description?: string;
  /** Example value for `detail`. Omitted from the example when not provided. */
  detail?: string;
  /** Example value for `instance`. Omitted from the example when not provided. */
  instance?: string;
  /**
   * Response headers to document (e.g. `Retry-After` for `429`/`503`).
   * Forwarded verbatim to `@ApiResponse`. Entries here **override** any
   * header auto-generated from {@link retryAfter}.
   */
  headers?: Record<string, HeaderObject | ReferenceObject>;
  /**
   * Override the entire response schema. Use when you have a stricter, more
   * specific shape than the canonical Problem Details schema (for example, a
   * subclass that always carries `errors`).
   */
  schema?: SchemaObject & Partial<ReferenceObject>;
  /**
   * Provide a named-examples map instead of a single example. When omitted, a
   * single example is generated from {@link status}, {@link type},
   * {@link title}, {@link detail}, {@link instance}.
   */
  examples?: Record<string, ApiResponseExamples>;
  /**
   * Documents the `Retry-After` response header (RFC 9110 §10.2.3) in the
   * OpenAPI spec automatically. Omitted if not provided.
   *
   * - `number` → documented as integer (delta-seconds)
   * - `Date`   → documented as `date-time` string
   * - `string` → documented as plain string
   */
  retryAfter?: RetryAfterValue;
  /**
   * Base URI for RFC 9457 `type` resolution, matching the `BASE_PROBLEMS_URI`
   * configured on {@link HttpExceptionFilter}. When provided, relative `type`
   * values are resolved into absolute URIs in the generated example (same
   * behavior as the runtime filter). Pass the same value you inject into the
   * filter to keep docs and wire format aligned.
   *
   * Query and fragment components of `baseUri` are discarded per RFC 3986
   * reference resolution.
   */
  baseUri?: string;
  /**
   * Custom status-to-type map, matching the `HTTP_ERRORS_MAP_KEY` configured
   * on {@link HttpExceptionFilter}. When provided, default `type` values for
   * unhandled status codes are looked up from this map instead of the built-in
   * defaults, keeping the documented example aligned with the runtime filter.
   *
   * Pass the same value you inject into the filter.
   */
  httpErrors?: Record<number, string>;
}

function buildExample(options: ApiProblemResponseOptions): IProblemDetail {
  const example: IProblemDetail = {
    type: resolveProblemUri(
      resolveProblemType(options.type, options.status, options.httpErrors),
      options.baseUri,
    ),
    title: resolveProblemTitle(options.title, options.status),
    status: options.status,
  };
  if (options.detail !== undefined) example.detail = options.detail;
  if (options.instance !== undefined) example.instance = options.instance;
  return example;
}

function buildRetryAfterHeader(value: RetryAfterValue): HeaderObject {
  if (typeof value === 'number') {
    return {
      description: 'Seconds to wait before retrying.',
      schema: { type: 'integer', minimum: 0 },
    };
  }
  if (value instanceof Date) {
    return {
      description:
        "IMF-fixdate (RFC 7231 §7.1.1.1) when the client may retry, e.g. 'Wed, 21 Oct 2026 07:28:00 GMT'.",
      schema: { type: 'string' },
    };
  }
  return {
    description:
      'Delay after which the client should retry (seconds or HTTP-date).',
    schema: { type: 'string' },
  };
}

/**
 * Documents an `application/problem+json` response (RFC 9457) on a NestJS
 * route handler or controller.
 *
 * Stackable: apply once per status code you want documented.
 *
 * @example
 * ```ts
 * @Controller('dragons')
 * export class DragonsController {
 *   @Get(':id')
 *   @ApiProblemResponse({ status: 404, type: 'not-found', title: 'Dragon not found' })
 *   @ApiProblemResponse({ status: 429, type: 'rate-limit-exceeded' })
 *   findOne(@Param('id') id: string) { ... }
 * }
 * ```
 */
export function ApiProblemResponse(
  options: ApiProblemResponseOptions,
): MethodDecorator & ClassDecorator {
  const description =
    options.description ?? resolveProblemTitle(options.title, options.status);

  const schema: SchemaObject & Partial<ReferenceObject> =
    options.schema ?? PROBLEM_DETAILS_SCHEMA;

  const mediaTypeObject: {
    schema: SchemaObject & Partial<ReferenceObject>;
    example?: IProblemDetail;
    examples?: Record<string, ApiResponseExamples>;
  } = { schema };

  if (options.examples !== undefined) {
    mediaTypeObject.examples = options.examples;
  } else {
    mediaTypeObject.example = buildExample(options);
  }

  const headers: Record<string, HeaderObject | ReferenceObject> = {};
  // Only document the header when the runtime filter would actually emit
  // it (same validation as `formatRetryAfter`) — otherwise the docs would
  // drift from the wire behavior.
  if (
    options.retryAfter !== undefined &&
    formatRetryAfter(options.retryAfter) !== undefined
  ) {
    headers['Retry-After'] = buildRetryAfterHeader(options.retryAfter);
  }
  if (options.headers !== undefined) {
    Object.assign(headers, options.headers);
  }

  const responseOptions: ApiResponseOptions = {
    status: options.status,
    description,
    content: { [PROBLEM_CONTENT_TYPE]: mediaTypeObject },
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };

  return applyDecorators(ApiResponse(responseOptions));
}
