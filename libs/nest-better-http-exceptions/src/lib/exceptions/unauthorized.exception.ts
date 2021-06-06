import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class UnauthorizedException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Unauthorized') {
    super(objectOrError, title, HttpStatus.UNAUTHORIZED);
  }
}
