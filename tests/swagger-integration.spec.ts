import {
  Controller,
  Get,
  INestApplication,
  Module,
  Param,
} from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';

import { HttpExceptionFilter, ProblemDetailsException } from '../src';
import { ApiProblemResponse } from '../src/swagger';

@Controller('dragons')
class SwaggerTestController {
  @Get(':id')
  @ApiProblemResponse({
    status: 404,
    type: 'not-found',
    title: 'Dragon not found',
    detail: 'No dragon with the given id exists',
    instance: '/dragons/99',
  })
  @ApiProblemResponse({
    status: 429,
    type: 'rate-limit-exceeded',
    retryAfter: 3600,
  })
  findOne(@Param('id') id: string) {
    throw new ProblemDetailsException({
      type: 'not-found',
      title: 'Dragon not found',
      status: 404,
      detail: 'No dragon with the given id exists',
      instance: `/dragons/${id}`,
    });
  }

  @Get()
  @ApiProblemResponse({
    status: 400,
    type: 'bad-request',
    baseUri: 'https://api.example.com/problems',
  })
  findAll() {}
}

@Module({
  controllers: [SwaggerTestController],
})
class SwaggerTestAppModule {}

const FIXTURE_DIR = join(__dirname, 'fixtures');
const FIXTURE_PATH = join(FIXTURE_DIR, 'swagger-document.json');

describe('Swagger/OpenAPI integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(SwaggerTestAppModule, { logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('generates a stable OpenAPI document matching the committed fixture', () => {
    const builder = new DocumentBuilder()
      .setTitle('Test API')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, builder);

    // Strip volatile / environment-specific fields so the fixture stays
    // reproducible across Node versions and CI runs.
    const sanitised = JSON.parse(JSON.stringify(document));
    delete sanitised.paths?.['/dragons/{id}']?.get?.operationId;
    delete sanitised.paths?.['/dragons']?.get?.operationId;
    delete sanitised.servers;
    delete sanitised.tags;

    const generated = JSON.stringify(sanitised, null, 2) + '\n';

    // Opt-in fixture refresh: `UPDATE_FIXTURES=1 npm test` rewrites the
    // committed JSON. CI runs without the flag so any drift fails loudly.
    if (process.env.UPDATE_FIXTURES) {
      mkdirSync(FIXTURE_DIR, { recursive: true });
      writeFileSync(FIXTURE_PATH, generated);
      return;
    }

    const fixture = readFileSync(FIXTURE_PATH, 'utf-8');
    expect(generated).toBe(fixture);
  });

  it('documented example matches the actual wire response body', async () => {
    // Fresh app with the filter installed before init(), so the endpoint
    // emits a real Problem Details body rather than Nest's default shape.
    const wireApp = await NestFactory.create(SwaggerTestAppModule, {
      logger: false,
    });
    wireApp.useGlobalFilters(
      new HttpExceptionFilter(wireApp.get(HttpAdapterHost)),
    );
    await wireApp.init();

    try {
      const document = SwaggerModule.createDocument(
        wireApp,
        new DocumentBuilder().setTitle('Test API').setVersion('1.0').build(),
      );

      const documentedExample = (
        document.paths['/dragons/{id}'].get!.responses['404'] as {
          content: Record<string, { example: Record<string, unknown> }>;
        }
      ).content['application/problem+json'].example;

      const response = await request(wireApp.getHttpServer())
        .get('/dragons/99')
        .expect(404);

      // type/title/status/detail/instance that the decorator documents must
      // match the body the filter actually emits. Shared resolvers guarantee
      // this by construction; this test catches any regression in wiring.
      expect(response.body).toMatchObject(documentedExample);
    } finally {
      await wireApp.close();
    }
  });
});
