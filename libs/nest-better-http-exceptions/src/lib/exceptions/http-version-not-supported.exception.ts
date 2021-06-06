import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class HttpVersionNotSupportedException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'HTTP Version Not Supported') {
    super(objectOrError, title, HttpStatus.HTTP_VERSION_NOT_SUPPORTED);
  }
}
