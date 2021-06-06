export interface IErrorDetail {
  type?: string;
  instance?: string;
  detail?: string;
  [key: string]: unknown;
}

export interface IErrorResponse extends IErrorDetail {
  title: string;
  status: number;
}
