import { HttpStatus } from '@nestjs/common';
import { BadGatewayException } from './bad-gateway.exception';
import { BadRequestException } from './bad-request.exception';
import { TypedHttpException } from './base/typed-http.exception';
import { ConflictException } from './conflict.exception';
import { ForbiddenException } from './forbidden.exception';
import { GatewayTimeoutException } from './gateway-timeout.exception';
import { GoneException } from './gone.exception';
import { HttpVersionNotSupportedException } from './http-version-not-supported.exception';
import { ImATeapotException } from './im-a-teapot.exception';
import { InternalServerErrorException } from './internal-server-error.exception';
import { MethodNotAllowedException } from './method-not-allowed.exception';
import { MisdirectedException } from './misdirected.exception';
import { NotAcceptableException } from './not-acceptable.exception';
import { NotFoundException } from './not-found.exception';
import { NotImplementedException } from './not-implemented.exception';
import { PayloadTooLargeException } from './payload-too-large.exception';
import { PreconditionFailedException } from './precondition-failed.exception';
import { RequestTimeoutException } from './request-timeout.exception';
import { ServiceUnavailableException } from './service-unavailable.exception';
import { UnauthorizedException } from './unauthorized.exception';
import { UnprocessableEntityException } from './unprocessable-entity.exception';
import { UnsupportedMediaTypeException } from './unsupported-media-type.exception';

const assumptions = [
  [
    'BadGatewayException',
    BadGatewayException,
    HttpStatus.BAD_GATEWAY,
    'Bad Gateway',
  ],
  [
    'BadRequestException',
    BadRequestException,
    HttpStatus.BAD_REQUEST,
    'Bad Request',
  ],
  ['ConflictException', ConflictException, HttpStatus.CONFLICT, 'Conflict'],
  ['ForbiddenException', ForbiddenException, HttpStatus.FORBIDDEN, 'Forbidden'],
  [
    'GatewayTimeoutException',
    GatewayTimeoutException,
    HttpStatus.GATEWAY_TIMEOUT,
    'Gateway Timeout',
  ],
  ['GoneException', GoneException, HttpStatus.GONE, 'Gone'],
  [
    'HttpVersionNotSupportedException',
    HttpVersionNotSupportedException,
    HttpStatus.HTTP_VERSION_NOT_SUPPORTED,
    'HTTP Version Not Supported',
  ],
  [
    'ImATeapotException',
    ImATeapotException,
    HttpStatus.I_AM_A_TEAPOT,
    "I'm a teapot",
  ],
  [
    'InternalServerErrorException',
    InternalServerErrorException,
    HttpStatus.INTERNAL_SERVER_ERROR,
    'Internal Server Error',
  ],
  [
    'MethodNotAllowedException',
    MethodNotAllowedException,
    HttpStatus.METHOD_NOT_ALLOWED,
    'Method Not Allowed',
  ],
  [
    'MisdirectedException',
    MisdirectedException,
    HttpStatus.MISDIRECTED,
    'Misdirected',
  ],
  [
    'NotAcceptableException',
    NotAcceptableException,
    HttpStatus.NOT_ACCEPTABLE,
    'Not Acceptable',
  ],
  ['NotFoundException', NotFoundException, HttpStatus.NOT_FOUND, 'Not Found'],
  [
    'NotImplementedException',
    NotImplementedException,
    HttpStatus.NOT_IMPLEMENTED,
    'Not Implemented',
  ],
  [
    'PayloadTooLargeException',
    PayloadTooLargeException,
    HttpStatus.PAYLOAD_TOO_LARGE,
    'Payload Too Large',
  ],
  [
    'PreconditionFailedException',
    PreconditionFailedException,
    HttpStatus.PRECONDITION_FAILED,
    'Precondition Failed',
  ],
  [
    'RequestTimeoutException',
    RequestTimeoutException,
    HttpStatus.REQUEST_TIMEOUT,
    'Request Timeout',
  ],
  [
    'ServiceUnavailableException',
    ServiceUnavailableException,
    HttpStatus.SERVICE_UNAVAILABLE,
    'Service Unavailable',
  ],
  [
    'UnauthorizedException',
    UnauthorizedException,
    HttpStatus.UNAUTHORIZED,
    'Unauthorized',
  ],
  [
    'UnprocessableEntityException',
    UnprocessableEntityException,
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Unprocessable Entity',
  ],
  [
    'UnsupportedMediaTypeException',
    UnsupportedMediaTypeException,
    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    'Unsupported Media Type',
  ],
];

describe('HTTP exceptions', () => {
  describe.each(assumptions)(
    '%s',
    (_name: string, constructor, status: number, title: string) => {
      describe('when created with no parameters', () => {
        const exception = createException<TypedHttpException>(constructor);

        it('should return the correct status code', () => {
          expect(exception.getStatus()).toBe(status);
        });

        it('should return the error title', () => {
          expect(exception.getResponse()).toEqual({
            title,
            status,
          });
        });
      });

      describe('when created with a description', () => {
        const errDetails = 'some error title';
        const exception = createException<TypedHttpException>(
          constructor,
          errDetails
        );

        it('should return the correct status code', () => {
          expect(exception.getStatus()).toBe(status);
        });

        it('should return the error title', () => {
          expect(exception.getResponse()).toEqual({
            title: errDetails,
            status,
            detail: title, // TODO fix me
          });
        });
      });
    }
  );
});

function createException<T>(constructor, ...args): T {
  if (args) {
    return new constructor(...args);
  }
  return new constructor();
}
