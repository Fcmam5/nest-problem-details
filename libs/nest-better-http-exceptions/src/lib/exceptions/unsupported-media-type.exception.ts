import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class UnsupportedMediaTypeException extends TypedHttpException {
  constructor(
    objectOrError?: string | IErrorDetail,
    title = 'Unsupported Media Type'
  ) {
    super(objectOrError, title, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
  }
}
