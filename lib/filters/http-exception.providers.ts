import { Provider } from '@nestjs/common';
import { defaultHttpErrors } from './constants';

export const BASE_PROBLEMS_URI: Provider = {
  provide: 'BASE_PROBLEMS_URI',
  useValue: '/',
};

export const HTTP_ERRORS_MAP: Provider = {
  provide: 'HTTP_ERRORS_MAP',
  useValue: defaultHttpErrors,
};
