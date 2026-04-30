import { HttpAdapterHost } from '@nestjs/core';
import { HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from '../filter/http-exception.filter';
import { IProblemDetail } from '../filter/interfaces';
import { PROBLEM_CONTENT_TYPE } from '../filter/constants';
import { ProblemDetailsException } from './problem-details.exception';

const mockGetResponse = jest.fn().mockImplementation(() => ({}));

const mockArgumentsHost = {
  switchToHttp: jest.fn().mockImplementation(() => ({
    getResponse: mockGetResponse,
    getRequest: jest.fn(),
  })),
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
} as unknown as HttpAdapterHost;

describe('ProblemDetailsException', () => {
  afterEach(() => jest.clearAllMocks());

  describe('shape', () => {
    it('exposes the requested status via HttpException.getStatus()', () => {
      const ex = new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        title: 'You shall not pass',
      });

      expect(ex.getStatus()).toBe(HttpStatus.FORBIDDEN);
    });

    it('packs flat input into the nested { message, error } shape the filter consumes', () => {
      const ex = new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        title: 'You do not have enough credit.',
        type: 'out-of-credit',
        detail: 'Your balance is 30, but that costs 50.',
        balance: 30,
        accounts: ['/account/12345', '/account/67890'],
      });

      expect(ex.getResponse()).toEqual({
        message: 'You do not have enough credit.',
        error: {
          type: 'out-of-credit',
          detail: 'Your balance is 30, but that costs 50.',
          balance: 30,
          accounts: ['/account/12345', '/account/67890'],
        },
      });
    });

    it('omits type and detail from error when not provided', () => {
      const ex = new ProblemDetailsException({
        status: HttpStatus.BAD_REQUEST,
        title: 'Bad Request',
      });

      expect(ex.getResponse()).toEqual({
        message: 'Bad Request',
        error: {},
      });
    });
  });

  describe('end-to-end through HttpExceptionFilter', () => {
    const filter = new HttpExceptionFilter(mockHttpAdapterHost);

    it('produces the canonical RFC 9457 shape when caught by the filter', () => {
      const ex = new ProblemDetailsException({
        status: HttpStatus.FORBIDDEN,
        title: 'You do not have enough credit.',
        type: 'out-of-credit',
        detail: 'Your balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
        balance: 30,
        accounts: ['/account/12345', '/account/67890'],
      });

      filter.catch(ex, mockArgumentsHost);

      const expected: IProblemDetail = {
        type: 'out-of-credit',
        title: 'You do not have enough credit.',
        status: HttpStatus.FORBIDDEN,
        detail: 'Your balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
        balance: 30,
        accounts: ['/account/12345', '/account/67890'],
      };

      expect(mockHttpAdapter.setHeader).toHaveBeenCalledWith(
        mockGetResponse(),
        'Content-Type',
        PROBLEM_CONTENT_TYPE,
      );
      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        mockGetResponse(),
        expected,
        HttpStatus.FORBIDDEN,
      );
    });

    it('lets the filter resolve a default type when type is omitted', () => {
      const ex = new ProblemDetailsException({
        status: HttpStatus.NOT_FOUND,
        title: 'Resource missing',
      });

      filter.catch(ex, mockArgumentsHost);

      expect(mockHttpAdapter.reply).toHaveBeenCalledWith(
        mockGetResponse(),
        {
          type: 'not-found',
          title: 'Resource missing',
          status: HttpStatus.NOT_FOUND,
          detail: undefined,
        },
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('Retry-After header (RFC 9110 §10.2.3)', () => {
    it('exposes retryAfter on the instance and strips it from the JSON body', () => {
      const ex = new ProblemDetailsException({
        status: HttpStatus.TOO_MANY_REQUESTS,
        title: 'Too Many Requests',
        retryAfter: 3600,
      });

      expect(ex.retryAfter).toBe(3600);
      expect(ex.getResponse()).toEqual({
        message: 'Too Many Requests',
        error: {},
      });
    });
  });
});
