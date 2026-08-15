import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import request from 'supertest';
import { HttpExceptionFilter } from '../../src';
import { TestAppModule } from '../test-app.module';

/**
 * End-to-end RFC 9457 invariants over a real Nest HTTP response.
 *
 * These are the authoritative checks for the requirements that involve the HTTP
 * layer itself — the mocked-adapter unit tests cannot prove them:
 *
 *   §3     Content-Type is application/problem+json
 *   §3.1.2 "Generators MUST use the same status code in the actual HTTP
 *          response" — i.e. httpResponse.status === body.status
 */
describe('RFC 9457 — HTTP integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await NestFactory.create(TestAppModule, { logger: false });
    app.useGlobalFilters(new HttpExceptionFilter(app.get(HttpAdapterHost)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  // A spread of statuses routed through `generic-string/:status`.
  const statuses = [400, 401, 403, 404, 409, 418, 422, 429, 500, 503];

  it.each(statuses)(
    '§3 — responds with application/problem+json for status %i',
    async (status) => {
      const response = await request(server())
        .get(`/api/test/generic-string/${status}`)
        .expect(status);

      expect(response.headers['content-type']).toContain(
        'application/problem+json',
      );
    },
  );

  it.each(statuses)(
    '§3.1.2 — HTTP response status equals body.status for %i',
    async (status) => {
      const response = await request(server()).get(
        `/api/test/generic-string/${status}`,
      );

      expect(response.status).toBe(status);
      expect(response.body.status).toBe(status);
      expect(response.body.status).toBe(response.status);
    },
  );

  it('§3 — body is a JSON object carrying type, title and status', async () => {
    const response = await request(server())
      .get('/api/test/default-not-found')
      .expect(404);

    expect(typeof response.body).toBe('object');
    expect(Array.isArray(response.body)).toBe(false);
    expect(typeof response.body.type).toBe('string');
    expect(typeof response.body.title).toBe('string');
    expect(typeof response.body.status).toBe('number');
  });

  it('§3.2 — extension members survive JSON serialization over the wire', async () => {
    const response = await request(server())
      .get('/api/test/business-error')
      .expect(403);

    expect(response.body).toEqual({
      type: 'out-of-credit',
      title: 'You do not have enough credit.',
      status: 403,
      detail: 'Your current balance is 30, but that costs 50.',
      instance: '/account/12345/msgs/abc',
      balance: 30,
      accounts: ['/account/12345', '/account/67890'],
    });
  });

  it('§5 — no stack traces or internals in the wire response', async () => {
    const response = await request(server())
      .get('/api/test/server-error')
      .expect(500);

    const raw = JSON.stringify(response.body);
    expect(raw).not.toContain('stack');
    expect(raw).not.toContain('node_modules');
    expect(response.body).not.toHaveProperty('statusCode');
  });
});
