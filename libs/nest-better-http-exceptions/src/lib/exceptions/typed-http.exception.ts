import { HttpException, HttpStatus } from '@nestjs/common';
import {
  IErrorDetail,
  IErrorResponse,
} from '../interfaces/error-detail.interface';

export abstract class TypedHttpException extends HttpException {
  private responseBody: IErrorResponse;

  constructor(objectOrError: string | IErrorDetail, message: string) {
    super({}, HttpStatus.BAD_GATEWAY);
    this.responseBody = this.createBody(objectOrError, message);
  }

  private createBody(
    objectOrError?: string | IErrorDetail,
    message?: string
  ): IErrorResponse {
    if (!objectOrError) {
      return { message };
    }

    if (typeof objectOrError === 'string') {
      return {
        message: objectOrError,
        error: message,
      };
    }
    return {
      message,
      error: { ...objectOrError },
    };
  }

  public getResponse(): IErrorResponse {
    return this.responseBody;
  }
}
