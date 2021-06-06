import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class NotAcceptableException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Not Acceptable') {
    super(objectOrError, title, HttpStatus.NOT_ACCEPTABLE);
  }
}
