import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { MAINTENANCE_RETRY_AT } from './test-app.module';

export function runIntegrationTests(
  description: string,
  createApp: () => Promise<INestApplication>,
  getServer: (app: INestApplication) => any,
) {
  describe(description, () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should return problem+json content type for default NotFoundException', async () => {
      const response = await request(getServer(app))
        .get('/api/test/default-not-found')
        .expect(404);

      expect(response.headers['content-type']).toContain(
        'application/problem+json',
      );
      expect(response.body).toEqual({
        type: 'not-found',
        title: 'Not Found',
        status: 404,
      });
    });

    it('should map NotFoundException with a custom title', async () => {
      const response = await request(getServer(app))
        .get('/api/test/custom-title')
        .expect(404);

      expect(response.body).toEqual({
        type: 'not-found',
        title: 'Dragon not found',
        status: 404,
        detail: 'Not Found',
      });
    });

    it('should map NotFoundException with a custom title and detail', async () => {
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

    it('should map default BadRequestException', async () => {
      const response = await request(getServer(app))
        .get('/api/test/bad-request')
        .expect(400);

      expect(response.body).toEqual({
        type: 'bad-request',
        title: 'Bad Request',
        status: 400,
      });
    });

    it('should map ForbiddenException with a custom title', async () => {
      const response = await request(getServer(app))
        .get('/api/test/forbidden')
        .expect(403);

      expect(response.body).toEqual({
        type: 'forbidden',
        title: 'you shall not pass!',
        status: 403,
        detail: 'Forbidden',
      });
    });

    it('should map generic HttpException with a string message', async () => {
      const response = await request(getServer(app))
        .get('/api/test/generic-string/418')
        .expect(418);

      expect(response.body).toEqual({
        type: 'i-am-a-teapot',
        title: 'I am a teapot',
        status: 418,
      });
    });

    it('should map generic HttpException with an object containing extra fields', async () => {
      const response = await request(getServer(app))
        .get('/api/test/generic-object/418')
        .expect(418);

      expect(response.body).toEqual({
        type: 'i-am-a-teapot',
        title: 'I am a teapot',
        status: 418,
        instance: 'Tea',
      });
    });

    it('should map custom error with explicit type and instance', async () => {
      const response = await request(getServer(app))
        .get(
          '/api/test/custom-error/422?type=validation-failure&instance=field-name',
        )
        .expect(422);

      expect(response.body).toEqual({
        type: 'validation-failure',
        title: 'Custom error',
        status: 422,
        instance: 'field-name',
      });
    });

    it('should map business-specific exception with custom fields', async () => {
      const response = await request(getServer(app))
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

    describe('Validation errors', () => {
      const invalidBody = {
        username: 'a',
        email: 'not-an-email',
        address: { street: '', city: '' },
      };

      const adminBody = {
        username: 'admin',
        email: 'admin@example.com',
        address: { street: '1 Main St', city: 'Paris' },
      };

      describe('Approach 1 — default ValidationPipe (flat string[] → errors array)', () => {
        it('returns a flat errors string[] for invalid body', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/default')
            .send(invalidBody)
            .expect(400);

          expect(response.body.type).toBe('bad-request');
          expect(response.body.title).toBe('Bad Request');
          expect(response.body.status).toBe(400);
          expect(Array.isArray(response.body.errors)).toBe(true);
          expect(response.body.errors.length).toBeGreaterThan(0);
          response.body.errors.forEach((e: unknown) =>
            expect(typeof e).toBe('string'),
          );
        });

        it('returns errors containing nested field messages', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/default')
            .send(invalidBody)
            .expect(400);

          const msgs: string[] = response.body.errors;
          expect(msgs.some((m) => m.includes('email'))).toBe(true);
          expect(
            msgs.some(
              (m) =>
                m.includes('street') ||
                m.includes('city') ||
                m.includes('address'),
            ),
          ).toBe(true);
        });

        it('fires the custom IsNotReservedUsername validator', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/default')
            .send(adminBody)
            .expect(400);

          const msgs: string[] = response.body.errors;
          expect(msgs.some((m) => m.includes('reserved'))).toBe(true);
        });
      });

      describe('Approach 2 — BadRequestException + exceptionFactory', () => {
        it('returns a field-map errors object', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/bad-request-factory')
            .send(invalidBody)
            .expect(400);

          expect(response.body.type).toBe('bad-request');
          expect(response.body.title).toBe('Validation failed');
          expect(response.body.status).toBe(400);
          expect(response.body.errors).toBeDefined();
          expect(typeof response.body.errors).toBe('object');
          expect(Array.isArray(response.body.errors)).toBe(false);
        });

        it('groups messages by field name including nested dotted paths', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/bad-request-factory')
            .send(invalidBody)
            .expect(400);

          const errors: Record<string, string[]> = response.body.errors;
          expect(errors['email']).toBeDefined();
          expect(Array.isArray(errors['email'])).toBe(true);
          expect(
            errors['address.street'] ?? errors['address.city'],
          ).toBeDefined();
        });

        it('includes custom validator error under correct field key', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/bad-request-factory')
            .send(adminBody)
            .expect(400);

          const errors: Record<string, string[]> = response.body.errors;
          expect(errors['username']).toBeDefined();
          expect(errors['username'].some((m) => m.includes('reserved'))).toBe(
            true,
          );
        });
      });

      describe('Approach 3A — ProblemDetailsException + field-map', () => {
        it('returns type validation-error with field-map errors', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/problem-details-field-map')
            .send(invalidBody)
            .expect(400);

          expect(response.body.type).toBe('validation-error');
          expect(response.body.title).toBe('Validation Failed');
          expect(response.body.status).toBe(400);
          expect(typeof response.body.errors).toBe('object');
          expect(Array.isArray(response.body.errors)).toBe(false);
        });

        it('groups by field including nested dotted paths', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/problem-details-field-map')
            .send(invalidBody)
            .expect(400);

          const errors: Record<string, string[]> = response.body.errors;
          expect(errors['email']).toBeDefined();
          expect(
            errors['address.street'] ?? errors['address.city'],
          ).toBeDefined();
        });
      });

      describe('Approach 3B — ProblemDetailsException + RFC 9457 JSON Pointer array', () => {
        it('returns an array with detail and pointer for each violation', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/problem-details-json-pointer')
            .send(invalidBody)
            .expect(400);

          expect(response.body.type).toBe('validation-error');
          expect(response.body.title).toBe('Validation Failed');
          expect(response.body.status).toBe(400);
          expect(Array.isArray(response.body.errors)).toBe(true);
          response.body.errors.forEach((e: unknown) => {
            expect(e).toHaveProperty('detail');
            expect(e).toHaveProperty('pointer');
          });
        });

        it('pointer values use JSON Pointer format (#/field)', async () => {
          const response = await request(getServer(app))
            .post('/api/test/validation/problem-details-json-pointer')
            .send(invalidBody)
            .expect(400);

          const pointers: string[] = response.body.errors.map(
            (e: { pointer: string }) => e.pointer,
          );
          expect(pointers.some((p) => p.startsWith('#/'))).toBe(true);
          expect(pointers.some((p) => p === '#/email')).toBe(true);
        });
      });
    });

    describe('Retry-After header (RFC 9110 §10.2.3)', () => {
      it('sets Retry-After: <seconds> for 429 with numeric retryAfter', async () => {
        const response = await request(getServer(app))
          .get('/api/test/rate-limited')
          .expect(429);

        expect(response.headers['retry-after']).toBe('60');
        expect(response.body).toEqual({
          type: 'rate-limit-exceeded',
          title: 'Too Many Requests',
          status: 429,
          detail: 'Quota exceeded.',
        });
        // retryAfter must NOT leak into the JSON body.
        expect(response.body).not.toHaveProperty('retryAfter');
      });

      it('sets Retry-After: <IMF-fixdate> for 503 with Date retryAfter', async () => {
        const response = await request(getServer(app))
          .get('/api/test/maintenance')
          .expect(503);

        expect(response.headers['retry-after']).toBe(
          MAINTENANCE_RETRY_AT.toUTCString(),
        );
        expect(response.body).toEqual({
          type: 'service-maintenance',
          title: 'Service Unavailable',
          status: 503,
          detail: 'Maintenance window in progress.',
        });
        expect(response.body).not.toHaveProperty('retryAfter');
      });

      it('omits Retry-After when retryAfter is not provided', async () => {
        const response = await request(getServer(app))
          .get('/api/test/rate-limited-no-retry')
          .expect(429);

        expect(response.headers['retry-after']).toBeUndefined();
        expect(response.body).toEqual({
          type: 'rate-limit-exceeded',
          title: 'Too Many Requests',
          status: 429,
        });
      });

      it('sets Retry-After for a native HttpException subclass exposing retryAfter (duck-typed)', async () => {
        const response = await request(getServer(app))
          .get('/api/test/native-rate-limited')
          .expect(429);

        expect(response.headers['retry-after']).toBe('90');
        expect(response.body).toEqual({
          type: 'rate-limit-exceeded',
          title: 'Too Many Requests',
          status: 429,
          detail: 'Slow down.',
        });
        expect(response.body).not.toHaveProperty('retryAfter');
      });

      it('sets Retry-After for a Nest ServiceUnavailableException subclass exposing retryAfter', async () => {
        const response = await request(getServer(app))
          .get('/api/test/native-maintenance')
          .expect(503);

        expect(response.headers['retry-after']).toBe('300');
        expect(response.body).toEqual({
          type: 'service-unavailable',
          title: 'Maintenance window in progress.',
          status: 503,
          detail: 'Service Unavailable',
        });
        expect(response.body).not.toHaveProperty('retryAfter');
      });
    });
  });
}
