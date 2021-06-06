import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class NotImplementedException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Not Implemented') {
    super(objectOrError, title, HttpStatus.NOT_IMPLEMENTED);
  }
}
