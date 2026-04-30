import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { IErrorDetail, IProblemDetail } from './http-exception.interface';
import {
  HTTP_EXCEPTION_FILTER_KEY,
  HTTP_ERRORS_MAP_KEY,
  BASE_PROBLEMS_URI_KEY,
  PROBLEM_CONTENT_TYPE,
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
