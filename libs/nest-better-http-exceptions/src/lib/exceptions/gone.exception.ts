import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class GoneException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Gone') {
    super(objectOrError, title, HttpStatus.GONE);
  }
}
