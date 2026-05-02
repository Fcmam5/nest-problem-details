import { HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import {
  ProblemDetailsException,
  ProblemDetailsInput,
} from '../exception/problem-details.exception';

/** RFC 9457 §3 JSON Pointer error entry. */
export interface PointerError {
  detail: string;
  pointer: string;
}

/**
 * Flatten a `class-validator` `ValidationError[]` tree into a DX-friendly
 * field-map: `{ "field": ["msg1", "msg2"], "nested.field": ["msg"] }`.
 *
 * - Top-level property → key is the property name.
 * - Nested property → key is a dotted path (`address.street`).
 * - Multiple constraints on the same property → multiple messages in the array.
 * - Custom validator constraints are included just like built-in ones.
 *
 * @param errors  Array returned by `class-validator` (e.g. from Nest's
 *                `ValidationPipe` `exceptionFactory` parameter).
 * @param prefix  Internal path prefix for recursive flattening; leave empty.
 * @returns       `Record<string, string[]>` mapping field path → messages.
 */
export function mapClassValidatorErrors(
  errors: ValidationError[],
  prefix = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const key = prefix ? `${prefix}.${error.property}` : error.property;

    if (error.constraints && Object.keys(error.constraints).length > 0) {
      result[key] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      Object.assign(result, mapClassValidatorErrors(error.children, key));
    }
  }

  return result;
}

/**
 * Convert a `class-validator` `ValidationError[]` into an RFC 9457-compliant
 * array of `{ detail, pointer }` objects using JSON Pointer notation.
 *
 * Nested properties produce dotted paths converted to JSON Pointer segments
 * (e.g. `address.street` → `#/address/street`).
 *
 * Use this when you need strict RFC 9457 §3 compliance and your clients
 * expect the canonical `errors` array format.
 *
 * @param errors  Array returned by `class-validator`.
 * @param prefix  Internal prefix for recursive flattening; leave empty.
 * @returns       `PointerError[]` — each violation as `{ detail, pointer }`.
 */
export function mapToPointerErrors(
  errors: ValidationError[],
  prefix = '',
): PointerError[] {
  const result: PointerError[] = [];

  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    const pointer = '#/' + path.replace(/\./g, '/');

    if (error.constraints) {
      for (const detail of Object.values(error.constraints)) {
        result.push({ detail, pointer });
      }
    }

    if (error.children && error.children.length > 0) {
      result.push(...mapToPointerErrors(error.children, path));
    }
  }

  return result;
}

/**
 * Build a `ProblemDetailsException` from a `class-validator` error array in
 * one call — the shortest path from `exceptionFactory` to a fully-formed
 * RFC 9457 response.
 *
 * By default it produces a DX-friendly field-map (`errors: Record<string,string[]>`).
 * Pass `{ usePointers: true }` to switch to RFC 9457 JSON Pointer format.
 *
 * @example — field map (default):
 * ```ts
 * new ValidationPipe({
 *   exceptionFactory: (e) => toValidationProblemDetails(e),
 * })
 * ```
 *
 * @example — RFC 9457 JSON Pointer:
 * ```ts
 * new ValidationPipe({
 *   exceptionFactory: (e) => toValidationProblemDetails(e, { usePointers: true }),
 * })
 * ```
 */
export function toValidationProblemDetails(
  validationErrors: ValidationError[],
  options?: {
    usePointers?: boolean;
    status?: number;
    title?: string;
    type?: string;
  },
): ProblemDetailsException {
  const {
    usePointers = false,
    status = HttpStatus.BAD_REQUEST,
    title = 'Validation Failed',
    type = 'validation-error',
  } = options ?? {};

  const errors = usePointers
    ? mapToPointerErrors(validationErrors)
    : mapClassValidatorErrors(validationErrors);

  const input: ProblemDetailsInput = { status, title, type, errors };
  return new ProblemDetailsException(input);
}
