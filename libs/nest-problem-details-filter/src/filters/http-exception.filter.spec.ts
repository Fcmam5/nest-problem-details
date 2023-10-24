import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  HttpExceptionFilter,
  PROBLEM_CONTENT_TYPE,
} from './http-exception.filter';
import { IErrorDetail, IProblemDetail } from './http-exception.interface';
import {
  HTTP_EXCEPTION_FILTER_KEY,
  HTTP_ERRORS_MAP_KEY,
  BASE_PROBLEMS_URI_KEY,
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
const mockHttpAdatperHost = {
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
        .useValue(mockHttpAdatperHost)
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
          detail: 'Forbidden', // TODO defaults are not needed
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
            useValue: mockHttpAdatperHost,
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
        instance: errorObject.error.instance,
      };

      filter.catch(new HttpException(errorObject, status), mockArgumentsHost);

      assertResponse(status, expectation);
    });
  });

  describe.each([
    ['HttpAdapterHost', mockHttpAdatperHost as HttpAdapterHost],
    ['HttpAdapter', mockHttpAdapter as HttpAdapterHost['httpAdapter']],
  ])('when used outside a module -- using %s', (_, httpAdapterOrHost) => {
    beforeAll(() => {
      filter = new HttpExceptionFilter(httpAdapterOrHost);
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

  function assertResponse(
    expectedStatus: number,
    expectedJson: IProblemDetail,
  ) {
    expect(mockHttpAdatperHost.httpAdapter.setHeader).toHaveBeenCalledWith(
      mockGetResponse(),
      'Content-Type',
      PROBLEM_CONTENT_TYPE,
    );
    expect(mockHttpAdatperHost.httpAdapter.reply).toHaveBeenCalledWith(
      mockGetResponse(),
      expectedJson,
      expectedStatus,
    );
  }
});
