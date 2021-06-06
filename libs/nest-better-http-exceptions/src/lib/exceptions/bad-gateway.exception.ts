import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class BadGatewayException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Bad Gateway') {
    super(objectOrError, title, HttpStatus.BAD_GATEWAY);
  }
}
