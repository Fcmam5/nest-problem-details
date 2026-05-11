import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import request from 'supertest';
import { HttpExceptionFilter } from '../src';
import { TestAppModule, TestAppModuleWithModule } from './test-app.module';
import { runIntegrationTests } from './integration-tests.suite';

function getServer(app: INestApplication): any {
  return app.getHttpServer();
}

describe('Default (Generic) Adapter', () => {
  runIntegrationTests(
    'as a global filter',
    async () => {
      const app = await NestFactory.create(TestAppModule);
      app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
      await app.init();
      return app;
    },
    getServer,
  );

  runIntegrationTests(
    'as a module',
    async () => {
      const app = await NestFactory.create(TestAppModuleWithModule);
      await app.init();
      return app;
    },
    getServer,
  );

  describe('suppressDetail option', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await NestFactory.create(TestAppModule);
      app.useGlobalFilters(
        new HttpExceptionFilter(
          app.get(HttpAdapterHost),
          '',
          undefined,
          ({ status }: { status: number }) => status >= 500,
        ),
      );
      await app.init();
    });

    afterAll(() => app.close());

    it('omits detail for 5xx responses', async () => {
      const response = await request(getServer(app))
        .get('/api/test/server-error')
        .expect(500);

      expect(response.body).toEqual({
        type: 'internal-server-error',
        title: 'Something went wrong',
        status: 500,
      });
      expect(response.body).not.toHaveProperty('detail');
    });

    it('keeps detail for 4xx responses', async () => {
      const response = await request(getServer(app))
        .get('/api/test/custom-title-detail')
        .expect(404);

      expect(response.body).toEqual({
        type: 'not-found',
        title: 'Dragon not found',
        status: 404,
        detail: 'Could not find any dragon with ID: 99',
      });
    });
  });
});
