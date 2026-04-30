import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpExceptionFilter } from '../src';
import { TestAppModule, TestAppModuleWithModule } from './test-app.module';
import { runIntegrationTests } from './integration-tests.suite';

function getExpressServer(app: INestApplication): any {
  return app.getHttpServer();
}

describe('Express', () => {
  runIntegrationTests(
    'as a global filter',
    async () => {
      const app = await NestFactory.create<NestExpressApplication>(
        TestAppModule,
        new ExpressAdapter(),
      );
      app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
      await app.init();
      return app;
    },
    getExpressServer,
  );

  runIntegrationTests(
    'as a module',
    async () => {
      const app = await NestFactory.create<NestExpressApplication>(
        TestAppModuleWithModule,
        new ExpressAdapter(),
      );
      await app.init();
      return app;
    },
    getExpressServer,
  );
});
