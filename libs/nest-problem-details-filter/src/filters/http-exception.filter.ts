import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Inject,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { STATUS_CODES } from 'http';
import {
  BASE_PROBLEMS_URI_KEY,
  DEFAULT_HTTP_ERRORS,
  DEFAULT_PROBLEM_TYPE,
  HTTP_ERRORS_MAP_KEY,
  PROBLEM_CONTENT_TYPE,
} from './constants';
import { IErrorDetail, IExceptionResponse } from './http-exception.interface';

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
      } else if (this.isErrorObject(errorResponse.error)) {
        const { type: _type, detail: _detail, ...rest } = errorResponse.error;
        type = _type;
        detail = _detail;
        objectExtras = rest;
      }
    }

    const responseBody = {
      ...objectExtras,
      type: this.resolveType(type, status),
      title: title ?? STATUS_CODES[status] ?? 'Error',
      status,
      detail,
    };

    httpAdapter.setHeader(response, 'Content-Type', PROBLEM_CONTENT_TYPE);
    httpAdapter.reply(response, responseBody, status);
  }

  /**
   * Type guard for the structured `error` payload of an `IExceptionResponse`.
   * Accepts any non-null, non-array object; rejects primitives, `null`, and
   * arrays so destructuring is safe.
   */
  private isErrorObject(
    value: unknown,
  ): value is NonNullable<IErrorDetail['error']> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private resolveType(type: string | undefined, status: number): string {
    const resolved = type ?? this.getDefaultType(status);
    // Per RFC 9457 §4.2.1, the default "about:blank" type MUST NOT be prefixed.
    if (resolved === DEFAULT_PROBLEM_TYPE) {
      return DEFAULT_PROBLEM_TYPE;
    }
    return [this.baseUri, resolved].filter(Boolean).join('/');
  }

  private getDefaultType(status: number): string {
    return this.defaultHttpErrors[status] ?? DEFAULT_PROBLEM_TYPE;
  }
}
