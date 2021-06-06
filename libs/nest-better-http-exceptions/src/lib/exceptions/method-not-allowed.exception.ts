import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class MethodNotAllowedException extends TypedHttpException {
  constructor(
    objectOrError?: string | IErrorDetail,
    title = 'Method Not Allowed'
  ) {
    super(objectOrError, title, HttpStatus.METHOD_NOT_ALLOWED);
  }
}
