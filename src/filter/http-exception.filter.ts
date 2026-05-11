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
  HTTP_ERRORS_MAP_KEY,
  PROBLEM_CONTENT_TYPE,
  SUPPRESS_DETAIL_KEY,
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

  constructor(
    @Inject(HttpAdapterHost)
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(BASE_PROBLEMS_URI_KEY)
    private baseUri = '',
    @Inject(HTTP_ERRORS_MAP_KEY)
    private defaultHttpErrors = DEFAULT_HTTP_ERRORS,
    @Inject(SUPPRESS_DETAIL_KEY)
    suppressDetail: SuppressDetail | undefined = undefined,
  ) {
    // Normalize boolean / undefined into a constant predicate so the request
    // path only ever invokes a function.
    this.suppressDetailFn =
      typeof suppressDetail === 'function'
        ? suppressDetail
        : () => suppressDetail === true;
  }

  catch(exception: HttpException, host: ArgumentsHost): void {
    const httpAdapter = this.httpAdapterHost.httpAdapter;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as
      | string
      | IExceptionResponse;

    let title: string | undefined;
    let detail: string | undefined;
    let type: string | undefined;
    let objectExtras: Record<string, unknown> | undefined;
    let errors: unknown;

    if (typeof errorResponse === 'string') {
      title = errorResponse;
    } else {
      const message = errorResponse.message;

      if (Array.isArray(message) && message.length > 0) {
        // Approach 1: Nest's default ValidationPipe emits a flat string[].
        // Per RFC 9457 §3.1.4 consumers SHOULD NOT parse `detail` for
        // information — put the array in `errors` instead.
        title = undefined; // resolves to HTTP status reason phrase
        errors = message;
      } else if (typeof message === 'string') {
        title = message;
      }

      if (typeof errorResponse.error === 'string') {
        detail = errorResponse.error;
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

    const suppressedDetail = this.shouldSuppressDetail(detail, {
      status,
      type: resolvedType,
      exception,
    })
      ? undefined
      : detail;

    const responseBody: Record<string, unknown> = {
      ...objectExtras,
      type: resolvedType,
      title: resolveProblemTitle(title, status),
      status,
      detail: suppressedDetail,
    };

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
    const resolved = resolveProblemType(type, status, this.defaultHttpErrors);
    return resolveProblemUri(resolved, this.baseUri);
  }
}
