import { IErrorDetail } from './interfaces';

/**
 * Type guard for the structured `error` payload of an `IExceptionResponse`.
 * Accepts any non-null, non-array object; rejects primitives, `null`, and
 * arrays so destructuring is safe.
 */
export function isErrorObject(
  value: unknown,
): value is NonNullable<IErrorDetail['error']> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Narrow a value to a `string`, or `undefined` for any other type, so the
 * filter treats a wrong-typed member as absent — RFC 9457 §3.1 requires such a
 * member to be "ignored".
 *
 * Mostly spec-lawyering: these members are already typed as `string`, so only
 * untyped JS callers or an explicit `as any` reach this. Kept because it costs
 * one branch, not because it is a realistic hazard.
 */
export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
