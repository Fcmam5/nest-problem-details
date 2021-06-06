import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class ImATeapotException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = "I'm a teapot") {
    super(objectOrError, title, HttpStatus.I_AM_A_TEAPOT);
  }
}
