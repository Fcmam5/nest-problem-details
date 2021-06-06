export interface IErrorDetail {
  type?: string;
  instance?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface IErrorResponse {
  message: string;
  error?: string | IErrorDetail;
}
