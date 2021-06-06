import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class BadRequestException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Bad Request') {
    super(objectOrError, title, HttpStatus.BAD_REQUEST);
  }
}
