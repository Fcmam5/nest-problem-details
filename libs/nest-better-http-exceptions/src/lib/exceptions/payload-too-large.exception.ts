import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class PayloadTooLargeException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Payload Too Large') {
    super(objectOrError, title, HttpStatus.PAYLOAD_TOO_LARGE);
  }
}
