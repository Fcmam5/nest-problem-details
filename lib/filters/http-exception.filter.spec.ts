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
import { IProblemDetail } from './http-exception.interface';

const mockJson = jest.fn();

const mockStatus = jest.fn().mockImplementation(() => ({
  json: mockJson,
}));

const mockType = jest.fn().mockImplementation(() => ({
  status: mockStatus,
}));

const mockGetResponse = jest.fn().mockImplementation(() => ({
  type: mockType,
}));

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

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when called with default parameters', () => {
    describe('default Http exceptions', () => {
      it('should map default exception when thrown with not parameters', () => {
        const status = HttpStatus.BAD_REQUEST;
        const expectation: IProblemDetail = {
          title: 'Bad Request',
          status,
          type: '/bad-request',
          instance: '',
        };

        filter.catch(new BadRequestException(), mockArgumentsHost);

        assertResponse(status, expectation);
      });

      it('should map default exception when thrown with error details', () => {
        const status = HttpStatus.FORBIDDEN;
        const details = 'you shall not pass!';

        const expectation: IProblemDetail = {
          title: 'Forbidden',
          detail: details,
          status,
          type: '/forbidden',
          instance: '',
        };

        filter.catch(new ForbiddenException(details), mockArgumentsHost);

        assertResponse(status, expectation);
      });

      it('should map default exception when thrown with error details and description', () => {
        const status = HttpStatus.FORBIDDEN;
        const description = 'Gandalf said';
        const details = 'you shall not pass!';

        const expectation: IProblemDetail = {
          title: description,
          detail: details,
          status,
          type: '/forbidden',
          instance: '',
        };

        filter.catch(
          new ForbiddenException(details, description),
          mockArgumentsHost,
        );

        assertResponse(status, expectation);
      });
    });

    describe('the generic HttpException', () => {
      it('should map HttpException response when called with a string', () => {
        const status = HttpStatus.I_AM_A_TEAPOT;
        const details = 'you shall not pass!';

        const expectation: IProblemDetail = {
          title: details,
          status,
          type: '/i-am-a-teapot',
          instance: '',
        };

        filter.catch(new HttpException(details, status), mockArgumentsHost);

        assertResponse(status, expectation);
      });

      it('should map HttpException response when called with an object', () => {
        const status = HttpStatus.I_AM_A_TEAPOT;
        const errorObject = {
          error: 'I am a teapot',
          status,
        };

        const expectation: IProblemDetail = {
          title: errorObject.error,
          status,
          type: '/i-am-a-teapot',
          instance: '',
        };

        filter.catch(new HttpException(errorObject, status), mockArgumentsHost);

        assertResponse(status, expectation);
      });
    });
  });

  function assertResponse(
    expectedStatus: number,
    expectedJson: IProblemDetail,
  ) {
    expect(mockType).toHaveBeenCalledWith(PROBLEM_CONTENT_TYPE);
    expect(mockStatus).toHaveBeenCalledWith(expectedStatus);
    expect(mockJson).toHaveBeenCalledWith(expectedJson);
  }
});
