import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IProblemDetail } from './http-exception.interface';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as
      | string
      | IExceptionResponse;

    let title: string | object;
    let detail: string | undefined;

    if (typeof errorResponse === 'string') {
      title = errorResponse;
    } else {
      if (errorResponse.error) {
        title = errorResponse.error;
        detail = errorResponse.message;
      } else {
        title = errorResponse.message;
      }
    }

    response.type(PROBLEM_CONTENT_TYPE).status(status).json({
      type: '', // TODO
      title,
      status,
      detail,
      instance: '', // TODO
    });
  }
}

interface IExceptionResponse {
  error?: string | object;
  message: string;
  statusCode: number;
}
