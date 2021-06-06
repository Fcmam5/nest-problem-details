import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class ServiceUnavailableException extends TypedHttpException {
  constructor(
    objectOrError?: string | IErrorDetail,
    title = 'Service Unavailable'
  ) {
    super(objectOrError, title, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
