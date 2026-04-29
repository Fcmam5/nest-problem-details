import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpExceptionFilter } from '../src/filters/http-exception.filter';
import { TestAppModule, TestAppModuleWithModule } from './test-app.module';
import { runIntegrationTests } from './integration-tests.suite';

function getFastifyServer(app: INestApplication): any {
  return app.getHttpServer();
}

describe('Fastify', () => {
  runIntegrationTests(
    'as a global filter',
    async () => {
      const app = await NestFactory.create<NestFastifyApplication>(
        TestAppModule,
        new FastifyAdapter(),
      );
      app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      return app;
    },
    getFastifyServer,
  );

  runIntegrationTests(
    'as a module',
    async () => {
      const app = await NestFactory.create<NestFastifyApplication>(
        TestAppModuleWithModule,
        new FastifyAdapter(),
      );
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      return app;
    },
    getFastifyServer,
  );
});
