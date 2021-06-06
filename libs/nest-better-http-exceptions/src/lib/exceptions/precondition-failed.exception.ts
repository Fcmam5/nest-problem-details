import { HttpStatus } from '@nestjs/common';
import { IErrorDetail } from '../interfaces/error-detail.interface';
import { TypedHttpException } from './base/typed-http.exception';

export class PreconditionFailedException extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, title = 'Precondition Failed') {
    super(objectOrError, title, HttpStatus.PRECONDITION_FAILED);
  }
}
