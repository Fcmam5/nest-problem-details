import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
} from '@nestjs/common';
import {
  HttpExceptionFilter,
  PROBLEM_CONTENT_TYPE,
} from './http-exception.filter';

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

  describe('default HttpExceptions', () => {
    it('should map default exception when thrown with not parameters', () => {
      filter.catch(new BadRequestException(), mockArgumentsHost);

      expect(mockType).toHaveBeenCalledWith(PROBLEM_CONTENT_TYPE);
      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockJson).toHaveBeenCalled();
    });

    it('should map default exception when thrown with error details', () => {
      const details = 'you shall not pass!';

      filter.catch(new ForbiddenException(details), mockArgumentsHost);

      expect(mockType).toHaveBeenCalledWith(PROBLEM_CONTENT_TYPE);
      expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockJson).toHaveBeenCalled();
    });
  });
});
