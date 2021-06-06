import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class UnprocessableEntityException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Unprocessable Entity') {
    super(objectOrError, title, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
