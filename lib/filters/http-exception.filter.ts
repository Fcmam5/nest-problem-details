import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.type(PROBLEM_CONTENT_TYPE).status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
