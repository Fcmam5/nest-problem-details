export { NestProblemDetailsModule } from './nest-problem-details.module';
export { HttpExceptionFilter } from './filters/http-exception.filter';

export {
  BASE_PROBLEMS_URI_KEY,
  DEFAULT_HTTP_ERRORS,
  HTTP_ERRORS_MAP_KEY,
  HTTP_EXCEPTION_FILTER_KEY,
  PROBLEM_CONTENT_TYPE,
  DEFAULT_PROBLEM_TYPE,
} from './filters/constants';

export {
  IProblemDetail,
  IErrorDetail,
} from './filters/http-exception.interface';
