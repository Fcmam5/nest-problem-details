import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class ForbiddenException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Forbidden') {
    super(objectOrError, title, HttpStatus.FORBIDDEN);
  }
}
