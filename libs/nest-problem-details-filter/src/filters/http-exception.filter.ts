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
  PROBLEM_CONTENT_TYPE,
} from './constants';
import { IErrorDetail } from './http-exception.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(HttpAdapterHost)
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(BASE_PROBLEMS_URI_KEY)
    private baseUri = '',
    @Inject(HTTP_ERRORS_MAP_KEY)
    private defaultHttpErrors = _defaultHttpErrors,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const httpAdapter = this.httpAdapterHost.httpAdapter;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as
      | string
      | IExceptionResponse;

    let title: string;
    let detail;
    let type: string | undefined;
    let objectExtras;

    if (typeof errorResponse === 'string') {
      title = errorResponse;
    } else {
      title = errorResponse.message;
      if (typeof errorResponse.error === 'string') {
        detail = errorResponse.error;
      } else {
        if (errorResponse.error) {
          const { type: _type, detail: _detail, ...rest } = errorResponse.error;
          type = _type;
          detail = _detail;
          objectExtras = rest;
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

    httpAdapter.setHeader(response, 'Content-Type', PROBLEM_CONTENT_TYPE);
    httpAdapter.reply(response, responseBody, status);
  }

  private getDefaultType(status: number) {
    if (status < 100 || status > 599) {
      return 'unsupported-http-code';
    }
    return this.defaultHttpErrors[status] ?? 'unknown-error';
  }
}

interface IExceptionResponse {
  message: string;
  error?: string | IErrorDetail['error'];
  statusCode: number;
}
