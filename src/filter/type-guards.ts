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
