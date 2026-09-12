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
 * Returns `value` when it is a string, otherwise `undefined`.
 *
 * Used on `type`, `detail` and `instance` so a wrong-typed value is treated as
 * if the caller never set it, which is what RFC 9457 §3.1 asks for.
 *
 * Easy to hit by accident: `HttpException` takes `Record<string, any>`, so the
 * nested `error` object is never type-checked. This compiles under `--strict`
 * and used to put `"detail": null` on the wire:
 *
 *     new HttpException({ message: 'Nope', error: { detail: null } }, 400);
 *
 * `ProblemDetailsException` does type these members, so that path was safe.
 */
export function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Type guard for the `Record<string, string[]>` `message` emitted by Nest v12's
 * `ValidationPipe` with `errorFormat: 'grouped'` (dotted field path → messages).
 *
 * The shape is checked, not assumed, so an arbitrary object `message` is not
 * surfaced on the wire. `Object.keys` rather than `for...in`: a request-supplied
 * `__proto__` path reassigns the map's prototype instead of adding a key.
 */
export function isGroupedValidationErrors(
  value: unknown,
): value is Record<string, string[]> {
  if (!isErrorObject(value)) return false;

  const keys = Object.keys(value);
  if (keys.length === 0) return false;

  return keys.every((key) => {
    const messages = (value as Record<string, unknown>)[key];
    return (
      Array.isArray(messages) &&
      messages.every((message) => typeof message === 'string')
    );
  });
}
