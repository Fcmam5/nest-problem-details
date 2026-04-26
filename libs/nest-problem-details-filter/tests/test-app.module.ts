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
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { NestProblemDetailsModule, HTTP_EXCEPTION_FILTER_KEY } from '../src';

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
