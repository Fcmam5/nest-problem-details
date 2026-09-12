import request from 'supertest';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { HttpExceptionFilter } from '../src';
import { CreateUserDto } from './dto/create-user.dto';

// Nest v12-only features. This file is compiled and run only when
// NEST_MAJOR=12 (see jest.config.js) so it can use real v12 APIs
// (HttpExceptionOptions.errorCode, ValidationPipe errorFormat) with no
// casts or feature-detection hacks.
@Controller('api/v12')
class V12Controller {
  @Get('error-code')
  errorCode(): void {
    throw new BadRequestException('Password is too weak', {
      errorCode: 'WEAK_PASSWORD',
    });
  }

  @Post('validation/grouped')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorFormat: 'grouped',
    }),
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validationGrouped(@Body() _dto: CreateUserDto): void {}
}

@Module({ controllers: [V12Controller] })
class V12Module {}

describe('Nest v12 features', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(
      V12Module,
      new ExpressAdapter(),
    );
    app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
    await app.init();
  });

  afterAll(() => app.close());

  it('surfaces HttpExceptionOptions.errorCode as an extension member', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v12/error-code')
      .expect(400);

    expect(response.body).toMatchObject({
      type: 'bad-request',
      title: 'Password is too weak',
      status: 400,
      detail: 'Bad Request',
      errorCode: 'WEAK_PASSWORD',
    });
  });

  it('surfaces errorFormat: grouped output as a field-map under errors', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v12/validation/grouped')
      .send({
        username: 'a',
        email: 'not-an-email',
        address: { street: '', city: '' },
      })
      .expect(400);

    expect(response.body.type).toBe('bad-request');
    expect(response.body.status).toBe(400);

    const errors: Record<string, string[]> = response.body.errors;
    expect(Array.isArray(errors)).toBe(false);
    expect(errors['email']).toBeDefined();
    expect(errors['address.street'] ?? errors['address.city']).toBeDefined();
  });
});
