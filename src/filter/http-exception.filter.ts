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
} from './constants';
import { IExceptionResponse } from './interfaces';
import { formatRetryAfter } from '../exception/retry-after';
import { isErrorObject } from './type-guards';
import {
  resolveProblemTitle,
  resolveProblemType,
  resolveProblemUri,
} from '../resolvers';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(HttpAdapterHost)
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(BASE_PROBLEMS_URI_KEY)
    private baseUri = '',
    @Inject(HTTP_ERRORS_MAP_KEY)
    private defaultHttpErrors = DEFAULT_HTTP_ERRORS,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const httpAdapter = this.httpAdapterHost.httpAdapter;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as
      | string
      | IExceptionResponse;

    let title: string | undefined;
    let detail;
    let type: string | undefined;
    let objectExtras;

    if (typeof errorResponse === 'string') {
      title = errorResponse;
    } else {
      // TODO #26: `errorResponse.message` may be `string[]` when Nest's
      // ValidationPipe is used, which produces a non-string `title` and
      // violates the RFC 9457 schema. The planned fix keeps `title` as the
      // status reason phrase and moves the array to the `invalid-params`
      // extension member (RFC 9457 §3 canonical example). See TODO.md #6
      // and #13 (`class-validator` mapper, gh#23). Until then, callers must
      // ensure `message` is a string.
      title = errorResponse.message;
      if (typeof errorResponse.error === 'string') {
        detail = errorResponse.error;
      } else if (isErrorObject(errorResponse.error)) {
        const { type: _type, detail: _detail, ...rest } = errorResponse.error;
        type = _type;
        detail = _detail;
        objectExtras = rest;
      }
    }

    const responseBody = {
      ...objectExtras,
      type: this.resolveType(type, status),
      title: resolveProblemTitle(title, status),
      status,
      detail,
    };

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

  private resolveType(type: string | undefined, status: number): string {
    const resolved = resolveProblemType(type, status, this.defaultHttpErrors);
    return resolveProblemUri(resolved, this.baseUri);
  }
}
