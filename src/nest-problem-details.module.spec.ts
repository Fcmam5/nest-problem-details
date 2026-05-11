import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  NestProblemDetailsModule,
  BASE_PROBLEMS_URI_KEY,
  HTTP_ERRORS_MAP_KEY,
  SUPPRESS_DETAIL_KEY,
  HTTP_EXCEPTION_FILTER_KEY,
  DEFAULT_HTTP_ERRORS,
  HttpExceptionFilter,
} from '.';

describe('NestProblemDetailsModule', () => {
  describe('static module (default registration)', () => {
    it('provides default values for all DI tokens', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [NestProblemDetailsModule],
      }).compile();

      expect(moduleRef.get(BASE_PROBLEMS_URI_KEY)).toBe('');
      expect(moduleRef.get(HTTP_ERRORS_MAP_KEY)).toBe(DEFAULT_HTTP_ERRORS);
      expect(moduleRef.get(SUPPRESS_DETAIL_KEY, { strict: false })).toBe(
        undefined,
      );
      expect(moduleRef.get(HTTP_EXCEPTION_FILTER_KEY)).toBeInstanceOf(
        HttpExceptionFilter,
      );
    });
  });

  describe('register()', () => {
    it('applies provided baseUri, httpErrorsMap and suppressDetail', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestProblemDetailsModule.register({
            baseUri: 'https://api.example.org/problems',
            httpErrorsMap: { 418: 'teapot-error' },
            suppressDetail: true,
          }),
        ],
      }).compile();

      expect(moduleRef.get(BASE_PROBLEMS_URI_KEY)).toBe(
        'https://api.example.org/problems',
      );
      expect(moduleRef.get(HTTP_ERRORS_MAP_KEY)).toEqual({
        ...DEFAULT_HTTP_ERRORS,
        418: 'teapot-error',
      });
      expect(moduleRef.get(SUPPRESS_DETAIL_KEY)).toBe(true);
      expect(moduleRef.get(HTTP_EXCEPTION_FILTER_KEY)).toBeInstanceOf(
        HttpExceptionFilter,
      );
    });

    it('falls back to defaults when called with no options', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [NestProblemDetailsModule.register()],
      }).compile();

      expect(moduleRef.get(BASE_PROBLEMS_URI_KEY)).toBe('');
      expect(moduleRef.get(HTTP_ERRORS_MAP_KEY)).toEqual(DEFAULT_HTTP_ERRORS);
      expect(moduleRef.get(SUPPRESS_DETAIL_KEY)).toBeUndefined();
    });

    it('merges httpErrorsMap on top of defaults without losing built-ins', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestProblemDetailsModule.register({
            httpErrorsMap: { 404: 'custom-not-found' },
          }),
        ],
      }).compile();

      const map = moduleRef.get<Record<number, string>>(HTTP_ERRORS_MAP_KEY);
      expect(map[404]).toBe('custom-not-found');
      expect(map[500]).toBe(DEFAULT_HTTP_ERRORS[500]);
    });
  });

  describe('registerAsync()', () => {
    it('resolves options from a useFactory', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestProblemDetailsModule.registerAsync({
            useFactory: () => ({
              baseUri: 'https://async.example.org/problems',
              suppressDetail: ({ status }) => status >= 500,
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(BASE_PROBLEMS_URI_KEY)).toBe(
        'https://async.example.org/problems',
      );
      expect(typeof moduleRef.get(SUPPRESS_DETAIL_KEY)).toBe('function');
    });

    it('supports async factories returning a promise', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestProblemDetailsModule.registerAsync({
            useFactory: async () => ({
              baseUri: 'https://promised.example.org/problems',
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(BASE_PROBLEMS_URI_KEY)).toBe(
        'https://promised.example.org/problems',
      );
    });

    it('falls back to empty baseUri when factory omits it', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestProblemDetailsModule.registerAsync({
            useFactory: () => ({}),
          }),
        ],
      }).compile();

      expect(moduleRef.get(BASE_PROBLEMS_URI_KEY)).toBe('');
      expect(moduleRef.get(HTTP_ERRORS_MAP_KEY)).toEqual(DEFAULT_HTTP_ERRORS);
      expect(moduleRef.get(SUPPRESS_DETAIL_KEY)).toBeUndefined();
    });

    it('injects dependencies into the factory', async () => {
      const CONFIG_TOKEN = 'CONFIG_TOKEN';

      @Module({
        providers: [
          {
            provide: CONFIG_TOKEN,
            useValue: { baseUri: 'https://injected.example.org' },
          },
        ],
        exports: [CONFIG_TOKEN],
      })
      class ConfigModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [
          NestProblemDetailsModule.registerAsync({
            imports: [ConfigModule],
            inject: [CONFIG_TOKEN],
            useFactory: (cfg: { baseUri: string }) => ({
              baseUri: cfg.baseUri,
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(BASE_PROBLEMS_URI_KEY)).toBe(
        'https://injected.example.org',
      );
    });
  });
});
