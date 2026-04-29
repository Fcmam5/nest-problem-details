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
