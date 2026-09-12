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

// Legacy contract for Nest v11 (NEST_MAJOR=11, see jest.config.js): v11 has
// no HttpExceptionOptions.errorCode and no ValidationPipe errorFormat, so the
// filter must omit `errorCode` and keep emitting the flat string[] `errors`.
@Controller('api/legacy')
class LegacyController {
  @Get('error-code')
  errorCode(): void {
    throw new BadRequestException('Password is too weak', {
      description: 'Password is too weak',
    });
  }

  @Post('validation/default')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validationDefault(@Body() _dto: CreateUserDto): void {}
}

@Module({ controllers: [LegacyController] })
class LegacyModule {}

describe('Nest v11 (legacy) behavior', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(
      LegacyModule,
      new ExpressAdapter(),
    );
    app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
    await app.init();
  });

  afterAll(() => app.close());

  it('does not emit an errorCode extension member', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/legacy/error-code')
      .expect(400);

    expect(response.body).not.toHaveProperty('errorCode');
  });

  it('emits flat string[] errors for default ValidationPipe output', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/legacy/validation/default')
      .send({
        username: 'a',
        email: 'not-an-email',
        address: { street: '', city: '' },
      })
      .expect(400);

    expect(Array.isArray(response.body.errors)).toBe(true);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });
});
