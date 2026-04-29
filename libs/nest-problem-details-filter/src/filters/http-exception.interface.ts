// As specified in RFC 9457 §3 (formerly RFC 7807 §3.1).
// https://datatracker.ietf.org/doc/html/rfc9457#section-3
// https://datatracker.ietf.org/doc/html/rfc7807#section-3.1
export interface IProblemDetail {
  status: number;
  title: string;
  type: string;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}

export interface IErrorDetail {
  message: string;
  error?: {
    type?: string;
    instance?: string;
    detail?: string;
    [key: string]: unknown;
  };
}

// Shape of the payload returned by `HttpException.getResponse()` when not a
// plain string. Mirrors NestJS's internal exception shape.
export interface IExceptionResponse {
  message: string;
  error?: string | IErrorDetail['error'];
  statusCode: number;
}
