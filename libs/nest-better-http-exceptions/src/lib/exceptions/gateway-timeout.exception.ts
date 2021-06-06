import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class GatewayTimeoutException extends TypedHttpException {
  constructor(
    objectOrError?: string | IErrorDetail,
    title = 'Gateway Timeout'
  ) {
    super(objectOrError, title, HttpStatus.GATEWAY_TIMEOUT);
  }
}
