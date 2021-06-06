import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class MisdirectedException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Misdirected') {
    super(objectOrError, title, HttpStatus.MISDIRECTED);
  }
}
