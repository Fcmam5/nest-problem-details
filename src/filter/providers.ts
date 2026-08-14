import { Provider } from '@nestjs/common';
import {
  DEFAULT_HTTP_ERRORS,
  HTTP_ERRORS_MAP_KEY,
  BASE_PROBLEMS_URI_KEY,
  HTTP_EXCEPTION_FILTER_KEY,
  SUPPRESS_DETAIL_KEY,
  STRICT_RFC_DEFAULTS_KEY,
} from './constants';
import { HttpExceptionFilter } from './http-exception.filter';

export const BASE_PROBLEMS_URI: Provider = {
  provide: BASE_PROBLEMS_URI_KEY,
  useValue: '',
};

export const HTTP_ERRORS_MAP: Provider = {
  provide: HTTP_ERRORS_MAP_KEY,
  useValue: DEFAULT_HTTP_ERRORS,
};

export const SUPPRESS_DETAIL: Provider = {
  provide: SUPPRESS_DETAIL_KEY,
  useValue: undefined,
};

// TODO #47: flip useValue to true in v2
// TODO #48: remove this provider in v3
export const STRICT_RFC_DEFAULTS: Provider = {
  provide: STRICT_RFC_DEFAULTS_KEY,
  useValue: false,
};

export const HTTP_EXCEPTION_FILTER: Provider = {
  provide: HTTP_EXCEPTION_FILTER_KEY,
  useClass: HttpExceptionFilter,
};
