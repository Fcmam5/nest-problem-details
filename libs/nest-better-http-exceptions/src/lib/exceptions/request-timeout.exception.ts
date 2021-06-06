import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class RequestTimeoutException extends TypedHttpException {
  constructor(
    objectOrError?: string | IErrorDetail,
    title = 'Request Timeout'
  ) {
    super(objectOrError, title, HttpStatus.REQUEST_TIMEOUT);
  }
}
