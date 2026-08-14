import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Inject,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import {
  BASE_PROBLEMS_URI_KEY,
  DEFAULT_HTTP_ERRORS,
  DEFAULT_PROBLEM_TYPE,
  HTTP_ERRORS_MAP_KEY,
  PROBLEM_CONTENT_TYPE,
  SUPPRESS_DETAIL_KEY,
  STRICT_RFC_DEFAULTS_KEY,
} from './constants';
import {
  IExceptionResponse,
  SuppressDetail,
  SuppressDetailContext,
} from './interfaces';
import { formatRetryAfter } from '../exception/retry-after';
import { isErrorObject } from './type-guards';
import {
  resolveProblemTitle,
  resolveProblemType,
  resolveProblemUri,
} from '../resolvers';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly suppressDetailFn: (ctx: SuppressDetailContext) => boolean;

  /**
   * Pre-resolved `type` URI per status code. Populated once from
   * `defaultHttpErrors` + `baseUri` so the request path skips two
   * `new URL(...)` calls when the caller does not provide a custom type.
   */
  private readonly typeUriCache: Map<number, string>;
  private readonly fallbackTypeUri: string;

  /**
   * @param httpAdapterHost  NestJS HTTP adapter host (injected).
   * @param baseUri          Base URI prepended to every problem `type`.
   * @param defaultHttpErrors  Status-to-type slug map.
   * @param suppressDetail   Omit `detail` from responses.
   * @param strictRfcDefaults  When `true`, emits `about:blank` as `type` for
   *   plain HTTP exceptions and maps the caller message to `detail` (with
   *   `title` taken from the HTTP reason phrase), per RFC 9457. Defaults to
   *   `false` for backward compatibility. Recommended: pass `true` for new
   *   projects. Will default to `true` in v2, and the parameter will be
   *   removed in v3.
   */
  constructor(
    @Inject(HttpAdapterHost)
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(BASE_PROBLEMS_URI_KEY)
    private baseUri = '',
    @Inject(HTTP_ERRORS_MAP_KEY)
    private defaultHttpErrors = DEFAULT_HTTP_ERRORS,
    @Inject(SUPPRESS_DETAIL_KEY)
    suppressDetail: SuppressDetail | undefined = undefined,
    @Inject(STRICT_RFC_DEFAULTS_KEY)
    private readonly strictRfcDefaults = false,
  ) {
    this.suppressDetailFn = this.normalizeSuppressDetail(suppressDetail);
    this.typeUriCache = this.buildTypeUriCache(defaultHttpErrors, baseUri);
    this.fallbackTypeUri = resolveProblemUri(DEFAULT_PROBLEM_TYPE, baseUri);
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const httpAdapter = this.httpAdapterHost.httpAdapter;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as
      string | IExceptionResponse;

    let title: string | undefined;
    let detail: string | undefined;
    let type: string | undefined;
    let objectExtras: Record<string, unknown> | undefined;
    let errors: unknown;

    if (typeof errorResponse === 'string') {
      // strictRfcDefaults: plain string is occurrence-specific → detail.
      // Legacy: plain string maps to title (original behavior).
      if (this.strictRfcDefaults) {
        detail = errorResponse;
      } else {
        title = errorResponse;
      }
    } else {
      const message = errorResponse.message;

      if (Array.isArray(message) && message.length > 0) {
        // Approach 1: Nest's default ValidationPipe emits a flat string[].
        // Per RFC 9457 §3.1.4 consumers SHOULD NOT parse `detail` for
        // information — put the array in `errors` instead.
        title = undefined; // resolves to HTTP status reason phrase
        errors = message;
      } else if (typeof message === 'string') {
        // strictRfcDefaults + no explicit caller-supplied type:
        //   message is occurrence-specific → detail; title resolves from the
        //   HTTP reason phrase (left undefined here). This applies whether or
        //   not a string `error` field is present, and to any exception that
        //   lacks an explicit type via the error-object form.
        // Legacy, or caller provided an explicit type via the error-object form:
        //   `message` is the best available title — keep legacy mapping.
        if (this.strictRfcDefaults && !isErrorObject(errorResponse.error)) {
          detail = message;
        } else {
          title = message;
        }
      }

      if (typeof errorResponse.error === 'string') {
        // strictRfcDefaults: title resolves from status; the NestJS `error`
        // string is redundant — drop it (detail was already set above).
        // Legacy: the `error` string (HTTP reason phrase) maps to detail.
        if (!this.strictRfcDefaults) {
          detail = errorResponse.error;
        }
      } else if (isErrorObject(errorResponse.error)) {
        const { type: _type, detail: _detail, ...rest } = errorResponse.error;
        type = _type;
        detail = _detail;
        objectExtras = rest;
      }

      // Approaches 2 & 3: caller supplied a structured `errors` value
      // (Record<string,string[]> field-map or RFC pointer array). Pass through.
      if (errorResponse.errors !== undefined) {
        errors = errorResponse.errors;
      }
    }

    const resolvedType = this.resolveType(type, status);

    const shouldSuppressDetailInResponse = this.shouldSuppressDetail(detail, {
      status,
      type: resolvedType,
      exception,
    });

    const responseBody: Record<string, unknown> = {
      ...objectExtras,
      type: resolvedType,
      title: resolveProblemTitle(title, status),
      status,
    };

    if (!shouldSuppressDetailInResponse && detail !== undefined) {
      responseBody['detail'] = detail;
    }

    if (errors !== undefined) {
      responseBody['errors'] = errors;
    }

    httpAdapter.setHeader(response, 'Content-Type', PROBLEM_CONTENT_TYPE);
    this.applyRetryAfter(response, exception);
    httpAdapter.reply(response, responseBody, status);
  }

  /**
   * Set `Retry-After` per RFC 9110 §10.2.3 when the caught exception
   * exposes a `retryAfter` instance property (e.g. `ProblemDetailsException`
   * with `retryAfter` set, or any custom `HttpException` subclass attaching
   * the same field). Invalid values (negative seconds, non-finite numbers,
   * invalid Date, blank strings) are skipped silently.
   */
  private applyRetryAfter(response: unknown, exception: HttpException): void {
    const value = (exception as { retryAfter?: unknown }).retryAfter;
    const formatted = formatRetryAfter(value);
    if (formatted === undefined) return;

    this.httpAdapterHost.httpAdapter.setHeader(
      response,
      'Retry-After',
      formatted,
    );
  }

  /**
   * Decide whether to omit the `detail` field. A throwing user-supplied
   * callback must not crash the exception filter, so any error is swallowed
   * and treated as "do not suppress".
   */
  private shouldSuppressDetail(
    detail: string | undefined,
    context: SuppressDetailContext,
  ): boolean {
    if (detail === undefined) return false;
    try {
      return this.suppressDetailFn(context);
    } catch {
      return false;
    }
  }

  private resolveType(type: string | undefined, status: number): string {
    // Common path: no custom type was set by the caller.
    if (type === undefined) {
      // strictRfcDefaults: plain HTTP exceptions carry no extra semantics →
      // use "about:blank" per RFC 9457 §4.2.1.
      if (this.strictRfcDefaults) return DEFAULT_PROBLEM_TYPE;
      return this.typeUriCache.get(status) ?? this.fallbackTypeUri;
    }
    // Rare path: caller supplied an explicit type. Resolve live.
    return resolveProblemUri(
      resolveProblemType(type, status, this.defaultHttpErrors),
      this.baseUri,
    );
  }

  /**
   * Normalize the `suppressDetail` option into a constant predicate so the
   * request path only ever invokes a function.
   */
  private normalizeSuppressDetail(
    suppressDetail: SuppressDetail | undefined,
  ): (ctx: SuppressDetailContext) => boolean {
    return typeof suppressDetail === 'function'
      ? suppressDetail
      : () => suppressDetail === true;
  }

  private buildTypeUriCache(
    defaultErrors: Record<number, string>,
    baseUri: string,
  ): Map<number, string> {
    const cache = new Map<number, string>();
    for (const [statusStr, typeValue] of Object.entries(defaultErrors)) {
      cache.set(Number(statusStr), resolveProblemUri(typeValue, baseUri));
    }
    return cache;
  }
}
