import { Module } from '@nestjs/common';
import {
  BASE_PROBLEMS_URI,
  HTTP_ERRORS_MAP,
  HTTP_EXCEPTION_FILTER,
} from './filters/http-exception.providers';

const providers = [BASE_PROBLEMS_URI, HTTP_ERRORS_MAP, HTTP_EXCEPTION_FILTER];

@Module({
  providers,
  exports: providers,
})
export class NestProblemDetailsModule {}
