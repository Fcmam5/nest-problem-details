import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class ConflictException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Conflict') {
    super(objectOrError, title, HttpStatus.CONFLICT);
  }
}
