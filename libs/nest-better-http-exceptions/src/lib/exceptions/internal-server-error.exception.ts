import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class InternalServerErrorException extends TypedHttpException {
  constructor(
    objectOrError?: string | IErrorDetail,
    title = 'Internal Server Error'
  ) {
    super(objectOrError, title, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
