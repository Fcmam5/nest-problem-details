import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { IErrorDetail, IProblemDetail } from './interfaces';
import {
  HTTP_EXCEPTION_FILTER_KEY,
  HTTP_ERRORS_MAP_KEY,
  BASE_PROBLEMS_URI_KEY,
  PROBLEM_CONTENT_TYPE,
  SUPPRESS_DETAIL_KEY,
} from './constants';
import { NestProblemDetailsModule } from '../nest-problem-details.module';
import { HttpAdapterHost } from '@nestjs/core';

const mockGetResponse = jest.fn().mockImplementation(() => ({}));

const mockHttpArgumentsHost = jest.fn().mockImplementation(() => ({
  getResponse: mockGetResponse,
  getRequest: jest.fn(),
}));

const mockArgumentsHost = {
  switchToHttp: mockHttpArgumentsHost,
  getArgByIndex: jest.fn(),
  getArgs: jest.fn(),
  getType: jest.fn(),
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
};

const mockHttpAdapter = {
  setHeader: jest.fn().mockReturnThis(),
  reply: jest.fn().mockReturnThis(),
} as unknown as HttpAdapterHost['httpAdapter'];
const mockHttpAdapterHost = {
  get httpAdapter() {
    return mockHttpAdapter;
  },
} as unknown as Pick<HttpAdapterHost, 'httpAdapter'>;

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when used as a module with default parameters', () => {
    beforeAll(async () => {
      const modRef = await Test.createTestingModule({
        imports: [NestProblemDetailsModule],
      })
        .overrideProvider(HttpAdapterHost)
        .useValue(mockHttpAdapterHost)
        .compile();
      filter = modRef.get<HttpExceptionFilter>(HTTP_EXCEPTION_FILTER_KEY);
    });

    describe('default Http exceptions', () => {
      it('should map default exception when thrown with not parameters', () => {
        const status = HttpStatus.BAD_REQUEST;
        const expectation: IProblemDetail = {
          title: 'Bad Request',
          status,
          type: 'bad-request',
        };

        filter.catch(new BadRequestException(), mockArgumentsHost);

        assertResponse(status, expectation);
      });

      it('should map default exception when thrown with error details', () => {
        const status = HttpStatus.FORBIDDEN;
        const title = 'you shall not pass!';

        const expectation: IProblemDetail = {
          title,
          status,
          type: 'forbidden',
          detail: 'Forbidden',
        };

        filter.catch(new ForbiddenException(title), mockArgumentsHost);

        assertResponse(status, expectation);
      });

      it('should map default exception when thrown with error details and description', () => {
        const status = HttpStatus.FORBIDDEN;
        const title = 'Gandalf said';
        const details = 'you shall not pass!';

        const expectation: IProblemDetail = {
          title,
          detail: details,
          status,
          type: 'forbidden',
        };

        filter.catch(new ForbiddenException(title, details), mockArgumentsHost);

        assertResponse(status, expectation);
      });

      it('should fallback to about:blank for valid but unmapped status codes (RFC 9457 §4.2.1)', () => {
        const status = 452; // Not a standard HTTP status code

        const expectation: IProblemDetail = {
          title: 'Custom error',
          status,
          type: 'about:blank',
        };

        filter.catch(
          new HttpException(expectation.title, status),
          mockArgumentsHost,
        );

        assertResponse(status, expectation);
      });

      it('should fallback to about:blank for non-standard HTTP codes', () => {
        const status = 999;

        const expectation: IProblemDetail = {
          title: 'Custom error',
          status,
          type: 'about:blank',
        };

        filter.catch(
          new HttpException(expectation.title, status),
          mockArgumentsHost,
        );

        assertResponse(status, expectation);
      });

      it('should fallback title to "Error" when both message and status reason phrase are missing', () => {
        const status = 999; // not in http.STATUS_CODES

        const expectation: IProblemDetail = {
          title: 'Error',
          status,
          type: 'about:blank',
        };

        filter.catch(
          new HttpException({} as unknown as string, status),
          mockArgumentsHost,
        );

        assertResponse(status, expectation);
      });

      it('should fallback title to status reason phrase when message is missing', () => {
        const status = HttpStatus.NOT_FOUND;

        const expectation: IProblemDetail = {
          title: 'Not Found',
          status,
          type: 'not-found',
        };

        filter.catch(
          new HttpException({} as unknown as string, status),
          mockArgumentsHost,
        );

        assertResponse(status, expectation);
      });

      describe('non-object errorResponse.error (defensive)', () => {
        const status = HttpStatus.BAD_REQUEST;

        it.each([
          ['number', 42],
          ['boolean true', true],
          ['boolean false', false],
          ['null', null],
          ['array', ['a', 'b']],
        ])(
          'should not crash and ignore %s payload in error',
          (_label, value) => {
            const errorObj = { message: 'oops', error: value as never };

            const expectation: IProblemDetail = {
              title: 'oops',
              status,
              type: 'bad-request',
            };

            expect(() =>
              filter.catch(
                new HttpException(errorObj, status),
                mockArgumentsHost,
              ),
            ).not.toThrow();

            assertResponse(status, expectation);
          },
        );
      });

      it('should map custom fields from error object into response body', () => {
        const status = HttpStatus.FORBIDDEN;
        const errorObj = {
          message: 'You do not have enough credit.',
          error: {
            type: 'out-of-credit',
            detail: 'Your current balance is 30, but that costs 50.',
            instance: '/account/12345/msgs/abc',
            balance: 30,
            accounts: ['/account/12345', '/account/67890'],
          },
        };

        const expectation = {
          type: 'out-of-credit',
          title: 'You do not have enough credit.',
          status,
          detail: 'Your current balance is 30, but that costs 50.',
          instance: '/account/12345/msgs/abc',
          balance: 30,
          accounts: ['/account/12345', '/account/67890'],
        };

        filter.catch(new HttpException(errorObj, status), mockArgumentsHost);

        assertResponse(status, expectation);
      });
    });

    describe('the generic HttpException', () => {
      it('should map HttpException response when called with a string', () => {
        const status = HttpStatus.I_AM_A_TEAPOT;
        const title = 'you shall not pass!';

        const expectation: IProblemDetail = {
          title,
          status,
          type: 'i-am-a-teapot',
        };

        filter.catch(new HttpException(title, status), mockArgumentsHost);

        assertResponse(status, expectation);
      });

      it('should map HttpException response when called with an object', () => {
        const status = HttpStatus.I_AM_A_TEAPOT;
        const errorObject: IErrorDetail = {
          message: 'I am a teapot',
        };

        const expectation: IProblemDetail = {
          title: errorObject.message,
          status,
          type: 'i-am-a-teapot',
        };

        filter.catch(new HttpException(errorObject, status), mockArgumentsHost);

        assertResponse(status, expectation);
      });
    });
  });

  describe('when overriding parameters', () => {
    const status = HttpStatus.I_AM_A_TEAPOT;
    const customErrorsMap = {
      [status]: 'some-problem-detail',
    };

    beforeAll(async () => {
      const modRef = await Test.createTestingModule({
        imports: [],
        providers: [
          {
            provide: HttpAdapterHost,
            useValue: mockHttpAdapterHost,
          },
          {
            provide: HTTP_ERRORS_MAP_KEY,
            useValue: customErrorsMap,
          },
          {
            provide: BASE_PROBLEMS_URI_KEY,
            useValue: 'http://fcmam5.me/problems',
          },
          {
            provide: SUPPRESS_DETAIL_KEY,
            useValue: undefined,
          },
          {
            provide: HTTP_EXCEPTION_FILTER_KEY,
            useClass: HttpExceptionFilter,
          },
        ],
      }).compile();

      filter = modRef.get<HttpExceptionFilter>(HTTP_EXCEPTION_FILTER_KEY);
    });

    it('should map HttpException response when called with an object', () => {
      const errorObject: IErrorDetail = {
        message: 'I am a teapot',
        error: {
          instance: 'Tea',
          type: 'some-problem-detail',
        },
      };

      const expectation: IProblemDetail = {
        title: errorObject.message,
        status,
        type: 'http://fcmam5.me/problems/some-problem-detail',
        instance: errorObject.error?.instance,
      };

      filter.catch(new HttpException(errorObject, status), mockArgumentsHost);

      assertResponse(status, expectation);
    });

    it('should NOT prefix baseUri when type resolves to about:blank (RFC 9457 §4.2.1)', () => {
      const unmappedStatus = 452;

      const expectation: IProblemDetail = {
        title: 'Custom error',
        status: unmappedStatus,
        type: 'about:blank',
      };

      filter.catch(
        new HttpException(expectation.title, unmappedStatus),
        mockArgumentsHost,
      );

      assertResponse(unmappedStatus, expectation);
    });
  });

  describe('when used outside a module', () => {
    beforeAll(() => {
      filter = new HttpExceptionFilter(mockHttpAdapterHost as HttpAdapterHost);
    });

    it('should map default exception when thrown with not parameters', () => {
      const status = HttpStatus.BAD_REQUEST;
      const expectation: IProblemDetail = {
        title: 'Bad Request',
        status,
        type: 'bad-request',
      };

      filter.catch(new BadRequestException(), mockArgumentsHost);

      assertResponse(status, expectation);
    });
  });

  describe('type URI normalization (RFC 9457 §3.1.1)', () => {
    function makeFilter(baseUri: string): HttpExceptionFilter {
      return new HttpExceptionFilter(
        mockHttpAdapterHost as HttpAdapterHost,
        baseUri,
      );
    }

    function caughtType(f: HttpExceptionFilter, ex: HttpException): string {
      f.catch(ex, mockArgumentsHost);
      const replyMock = mockHttpAdapterHost.httpAdapter.reply as jest.Mock;
      const calls = replyMock.mock.calls;
      const lastBody = calls[calls.length - 1]?.[1] as IProblemDetail;
      return lastBody.type as string;
    }

    it('passes absolute http(s) URI through without prefixing baseUri', () => {
      const ex = new HttpException(
        {
          message: 'Bad',
          error: { type: 'https://docs.example.com/errors/foo' },
        },
        HttpStatus.BAD_REQUEST,
      );
      expect(caughtType(makeFilter('https://api.example.com'), ex)).toBe(
        'https://docs.example.com/errors/foo',
      );
    });

    it('passes other URI schemes (e.g. urn:) through unprefixed', () => {
      const ex = new HttpException(
        { message: 'Bad', error: { type: 'urn:problems:rate-limit' } },
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(caughtType(makeFilter('https://api.example.com'), ex)).toBe(
        'urn:problems:rate-limit',
      );
    });

    it('keeps about:blank bare even when baseUri is set (RFC 9457 §4.2.1)', () => {
      // 452 has no mapping → falls back to about:blank.
      const ex = new HttpException('Custom', 452);
      expect(caughtType(makeFilter('https://api.example.com'), ex)).toBe(
        'about:blank',
      );
    });

    it('does not produce a double slash with trailing-slashed baseUri', () => {
      const ex = new HttpException(
        { message: 'Bad', error: { type: 'errors/foo' } },
        HttpStatus.BAD_REQUEST,
      );
      expect(caughtType(makeFilter('https://api.example.com/'), ex)).toBe(
        'https://api.example.com/errors/foo',
      );
    });

    it('does not produce a double slash with leading-slashed type', () => {
      const ex = new HttpException(
        { message: 'Bad', error: { type: '/errors/foo' } },
        HttpStatus.BAD_REQUEST,
      );
      expect(caughtType(makeFilter('https://api.example.com'), ex)).toBe(
        'https://api.example.com/errors/foo',
      );
    });

    it('returns relative type as-is when baseUri is empty', () => {
      const ex = new HttpException(
        { message: 'Bad', error: { type: 'errors/foo' } },
        HttpStatus.BAD_REQUEST,
      );
      expect(caughtType(makeFilter(''), ex)).toBe('errors/foo');
    });

    it('falls back to raw type when baseUri is unparseable as a URL', () => {
      const ex = new HttpException(
        { message: 'Bad', error: { type: 'errors/foo' } },
        HttpStatus.BAD_REQUEST,
      );
      // `:::` has no valid scheme — URL constructor throws.
      expect(caughtType(makeFilter(':::'), ex)).toBe('errors/foo');
    });
  });

  describe('Retry-After header (RFC 9110 §10.2.3)', () => {
    beforeAll(() => {
      filter = new HttpExceptionFilter(mockHttpAdapterHost as HttpAdapterHost);
    });

    it('sets Retry-After when any HttpException subclass exposes a retryAfter property (duck-typed)', () => {
      class RateLimitException extends HttpException {
        readonly retryAfter = 120;
        constructor() {
          super('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
        }
      }

      filter.catch(new RateLimitException(), mockArgumentsHost);

      expect(mockHttpAdapterHost.httpAdapter.setHeader).toHaveBeenCalledWith(
        mockGetResponse(),
        'Retry-After',
        '120',
      );
    });
  });

  describe('Validation error handling', () => {
    const status = HttpStatus.BAD_REQUEST;

    describe('Approach 1 — default ValidationPipe (string[] message)', () => {
      it('puts message array into errors and resolves title from status', () => {
        filter.catch(
          new BadRequestException({
            message: [
              'email must be an email',
              'name must be longer than or equal to 3 characters',
            ],
            error: 'Bad Request',
            statusCode: status,
          }),
          mockArgumentsHost,
        );

        assertResponse(status, {
          type: 'bad-request',
          title: 'Bad Request',
          status,
          detail: 'Bad Request',
          errors: [
            'email must be an email',
            'name must be longer than or equal to 3 characters',
          ],
        } as unknown as IProblemDetail);
      });

      it('omits errors when message array is empty', () => {
        filter.catch(
          new BadRequestException({
            message: [],
            error: 'Bad Request',
            statusCode: status,
          }),
          mockArgumentsHost,
        );

        const call = (mockHttpAdapterHost.httpAdapter.reply as jest.Mock).mock
          .calls[0][1];
        expect(call).not.toHaveProperty('errors');
      });
    });

    describe('Approach 2 — BadRequestException with explicit errors field-map', () => {
      it('passes errors object through to response', () => {
        filter.catch(
          new BadRequestException({
            message: 'Validation failed',
            errors: {
              email: ['must be an email'],
              'address.city': ['should not be empty'],
            },
            statusCode: status,
          }),
          mockArgumentsHost,
        );

        assertResponse(status, {
          type: 'bad-request',
          title: 'Validation failed',
          status,
          errors: {
            email: ['must be an email'],
            'address.city': ['should not be empty'],
          },
        } as unknown as IProblemDetail);
      });
    });

    describe('Approach 3B — RFC 9457 JSON Pointer array via ProblemDetailsException', () => {
      it('passes errors pointer array through to response', () => {
        filter.catch(
          new HttpException(
            {
              message: 'Validation Failed',
              errors: [
                { detail: 'must be an email', pointer: '#/email' },
                { detail: 'must be a positive integer', pointer: '#/age' },
              ],
              statusCode: status,
            },
            status,
          ),
          mockArgumentsHost,
        );

        assertResponse(status, {
          type: 'bad-request',
          title: 'Validation Failed',
          status,
          errors: [
            { detail: 'must be an email', pointer: '#/email' },
            { detail: 'must be a positive integer', pointer: '#/age' },
          ],
        } as unknown as IProblemDetail);
      });
    });
  });

  describe('suppressDetail option', () => {
    it('omits detail when suppressDetail returns true', () => {
      const suppressFilter = new HttpExceptionFilter(
        mockHttpAdapterHost as HttpAdapterHost,
        '',
        undefined,
        ({ status }: { status: number }) => status >= 500,
      );

      suppressFilter.catch(
        new HttpException(
          { message: 'Oops', error: 'DB timeout', statusCode: 500 },
          500,
        ),
        mockArgumentsHost,
      );

      expect(mockHttpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockGetResponse(),
        expect.objectContaining({ status: 500, detail: undefined }),
        500,
      );
    });

    it('keeps detail when suppressDetail returns false', () => {
      const suppressFilter = new HttpExceptionFilter(
        mockHttpAdapterHost as HttpAdapterHost,
        '',
        undefined,
        ({ status }: { status: number }) => status >= 500,
      );

      suppressFilter.catch(
        new HttpException(
          { message: 'Not Found', error: 'Dragon missing', statusCode: 404 },
          404,
        ),
        mockArgumentsHost,
      );

      expect(mockHttpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockGetResponse(),
        expect.objectContaining({ status: 404, detail: 'Dragon missing' }),
        404,
      );
    });

    it('keeps detail when suppressDetail is not configured', () => {
      const bareFilter = new HttpExceptionFilter(
        mockHttpAdapterHost as HttpAdapterHost,
      );

      bareFilter.catch(
        new HttpException(
          { message: 'Oops', error: 'DB timeout', statusCode: 500 },
          500,
        ),
        mockArgumentsHost,
      );

      expect(mockHttpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockGetResponse(),
        expect.objectContaining({ status: 500, detail: 'DB timeout' }),
        500,
      );
    });

    it('omits detail on all responses when suppressDetail is true', () => {
      const suppressFilter = new HttpExceptionFilter(
        mockHttpAdapterHost as HttpAdapterHost,
        '',
        undefined,
        true,
      );

      suppressFilter.catch(
        new HttpException(
          { message: 'Not Found', error: 'Dragon missing', statusCode: 404 },
          404,
        ),
        mockArgumentsHost,
      );

      expect(mockHttpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockGetResponse(),
        expect.objectContaining({ status: 404, detail: undefined }),
        404,
      );
    });

    it('preserves detail when the callback throws', () => {
      const suppressFilter = new HttpExceptionFilter(
        mockHttpAdapterHost as HttpAdapterHost,
        '',
        undefined,
        () => {
          throw new Error('boom');
        },
      );

      expect(() =>
        suppressFilter.catch(
          new HttpException(
            { message: 'Oops', error: 'DB timeout', statusCode: 500 },
            500,
          ),
          mockArgumentsHost,
        ),
      ).not.toThrow();

      expect(mockHttpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
        mockGetResponse(),
        expect.objectContaining({ status: 500, detail: 'DB timeout' }),
        500,
      );
    });

    it('passes status, type, and exception to the callback', () => {
      const suppressFn = jest.fn().mockReturnValue(false);
      const suppressFilter = new HttpExceptionFilter(
        mockHttpAdapterHost as HttpAdapterHost,
        '',
        undefined,
        suppressFn,
      );
      const exception = new HttpException(
        { message: 'Gone', error: 'Resource deleted', statusCode: 410 },
        410,
      );

      suppressFilter.catch(exception, mockArgumentsHost);

      expect(suppressFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 410,
          type: 'gone',
          exception,
        }),
      );
    });
  });

  function assertResponse(
    expectedStatus: number,
    expectedJson: IProblemDetail,
  ) {
    expect(mockHttpAdapterHost.httpAdapter.setHeader).toHaveBeenCalledWith(
      mockGetResponse(),
      'Content-Type',
      PROBLEM_CONTENT_TYPE,
    );
    expect(mockHttpAdapterHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockGetResponse(),
      expectedJson,
      expectedStatus,
    );
  }
});
