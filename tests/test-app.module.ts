import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Module,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import {
  NestProblemDetailsModule,
  HTTP_EXCEPTION_FILTER_KEY,
  ProblemDetailsException,
} from '../src';

// Fixed instant used by Retry-After Date integration test.
export const MAINTENANCE_RETRY_AT = new Date('2026-04-30T06:00:00Z');

@Controller('api/test')
export class TestController {
  @Get('default-not-found')
  defaultNotFound(): void {
    throw new NotFoundException();
  }

  @Get('custom-title')
  customTitle(): void {
    throw new NotFoundException('Dragon not found');
  }

  @Get('custom-title-detail')
  customTitleAndDetail(): void {
    throw new NotFoundException(
      'Dragon not found',
      'Could not find any dragon with ID: 99',
    );
  }

  @Get('generic-string/:status')
  genericString(@Param('status') status: string): void {
    throw new HttpException('I am a teapot', parseInt(status, 10));
  }

  @Get('generic-object/:status')
  genericObject(@Param('status') status: string): void {
    throw new HttpException(
      { message: 'I am a teapot', error: { instance: 'Tea' } },
      parseInt(status, 10),
    );
  }

  @Get('bad-request')
  badRequest(): void {
    throw new BadRequestException();
  }

  @Get('forbidden')
  forbidden(): void {
    throw new ForbiddenException('you shall not pass!');
  }

  @Get('custom-error/:status')
  customError(
    @Param('status') status: string,
    @Query('type') type?: string,
    @Query('instance') instance?: string,
  ): void {
    const errorObj: Record<string, unknown> = {
      message: 'Custom error',
    };
    if (type || instance) {
      errorObj.error = {};
      if (type) (errorObj.error as Record<string, unknown>).type = type;
      if (instance)
        (errorObj.error as Record<string, unknown>).instance = instance;
    }
    throw new HttpException(errorObj, parseInt(status, 10));
  }

  @Get('business-error')
  businessError(): void {
    throw new HttpException(
      {
        message: 'You do not have enough credit.',
        error: {
          type: 'out-of-credit',
          detail: 'Your current balance is 30, but that costs 50.',
          instance: '/account/12345/msgs/abc',
          balance: 30,
          accounts: ['/account/12345', '/account/67890'],
        },
      },
      403,
    );
  }

  @Get('rate-limited')
  rateLimited(): void {
    throw new ProblemDetailsException({
      type: 'rate-limit-exceeded',
      title: 'Too Many Requests',
      status: 429,
      detail: 'Quota exceeded.',
      retryAfter: 60,
    });
  }

  @Get('maintenance')
  maintenance(): void {
    throw new ProblemDetailsException({
      type: 'service-maintenance',
      title: 'Service Unavailable',
      status: 503,
      detail: 'Maintenance window in progress.',
      retryAfter: MAINTENANCE_RETRY_AT,
    });
  }

  @Get('rate-limited-no-retry')
  rateLimitedNoRetry(): void {
    throw new ProblemDetailsException({
      type: 'rate-limit-exceeded',
      title: 'Too Many Requests',
      status: 429,
    });
  }

  @Get('native-rate-limited')
  nativeRateLimited(): void {
    // Native HttpException subclass exposing `retryAfter` as an instance
    // property — picked up by the filter via duck typing, no coupling to
    // ProblemDetailsException.
    class RateLimitException extends HttpException {
      readonly retryAfter = 90;
      constructor() {
        super(
          {
            message: 'Too Many Requests',
            error: { type: 'rate-limit-exceeded', detail: 'Slow down.' },
          },
          429,
        );
      }
    }
    throw new RateLimitException();
  }

  @Get('native-maintenance')
  nativeMaintenance(): void {
    // Subclass of Nest's `ServiceUnavailableException` (which itself extends
    // `HttpException`) that exposes a `retryAfter` instance property.
    class MaintenanceException extends ServiceUnavailableException {
      constructor(public readonly retryAfter: number) {
        super('Maintenance window in progress.');
      }
    }
    throw new MaintenanceException(300);
  }
}

@Module({
  controllers: [TestController],
})
export class TestAppModule {}

@Module({
  imports: [NestProblemDetailsModule],
  controllers: [TestController],
  providers: [
    {
      provide: APP_FILTER,
      useExisting: HTTP_EXCEPTION_FILTER_KEY,
    },
  ],
})
export class TestAppModuleWithModule {}
