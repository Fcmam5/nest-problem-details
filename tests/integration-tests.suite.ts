import request from 'supertest';
import { INestApplication } from '@nestjs/common';

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
  });
}
