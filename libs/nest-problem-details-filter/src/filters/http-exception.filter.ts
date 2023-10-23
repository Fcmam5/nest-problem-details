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
  defaultHttpErrors as _defaultHttpErrors,
  HTTP_ERRORS_MAP_KEY,
} from './constants';
import { IErrorDetail } from './http-exception.interface';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(HttpAdapterHost)
    private readonly httpAdapterOrHost:
      | HttpAdapterHost
      | HttpAdapterHost['httpAdapter'],
    @Inject(BASE_PROBLEMS_URI_KEY)
    private baseUri = '',
    @Inject(HTTP_ERRORS_MAP_KEY)
    private defaultHttpErrors = _defaultHttpErrors,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    // Using the HttpAdapterHost allows us to support both
    // the HttpAdapterHost and the HttpAdapterHost.httpAdapter for an easier API.
    const httpAdapter =
      // Using property in operator instead of instanceof for flexibility sake.
      'httpAdapter' in this.httpAdapterOrHost
        ? this.httpAdapterOrHost.httpAdapter
        : this.httpAdapterOrHost;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as
      | string
      | IExceptionResponse;

    let title: string;
    let detail;
    let type: string | undefined;
    let objectExtras = {};

    if (typeof errorResponse === 'string') {
      title = errorResponse;
    } else {
      title = errorResponse.message;
      if (typeof errorResponse.error === 'string') {
        detail = errorResponse.error;
      } else {
        if (errorResponse.error) {
          type = errorResponse.error.error?.type;
          objectExtras = {
            ...errorResponse.error,
          };
        }
      }
    }

    const responseBody = {
      ...objectExtras,
      type: [this.baseUri, type || this.getDefaultType(status)]
        .filter(Boolean)
        .join('/'),
      title,
      status,
      detail,
    };
    httpAdapter
      .setHeader(response, 'Content-Type', PROBLEM_CONTENT_TYPE)
      .reply(response, responseBody, status);
  }

  private getDefaultType(status: number) {
    return this.defaultHttpErrors[status];
  }
}

interface IExceptionResponse {
  // eslint-disable-next-line @typescript-eslint/ban-types
  error?: string | IErrorDetail;
  message: string;
  type?: string;
  instance?: string;
  statusCode: number;
}
