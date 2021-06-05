// As specified in https://datatracker.ietf.org/doc/html/rfc7807#section-3.1
export interface IProblemDetail {
  status: number;
  title: string;
  type: string;
  detail?: string;
  instance?: string;
  [key: string]: any;
}

export interface IErrorDetail {
  message: string;
  error?: {
    type?: string;
    instance?: string;
    detail?: string;
  };
}
