import { HttpException } from '@nestjs/common';
import {
  IErrorDetail,
  IErrorResponse,
} from '../../interfaces/error-detail.interface';

export abstract class TypedHttpException extends HttpException {
  private responseBody: IErrorResponse;

  constructor(
    objectOrError: string | IErrorDetail,
    title: string,
    statusCode: number
  ) {
    super({}, statusCode);
    this.responseBody = this.createBody(statusCode, objectOrError, title);
  }

  private createBody(
    status: number,
    objectOrError?: string | IErrorDetail,
    title?: string
  ): IErrorResponse {
    if (!objectOrError) {
      return { title, status };
    }

    if (typeof objectOrError === 'string') {
      return {
        title: objectOrError,
        detail: title,
        status,
      };
    }
    return {
      ...objectOrError,
      title,
      status,
    };
  }

  public getResponse(): IErrorResponse {
    return this.responseBody;
  }
}
