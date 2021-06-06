import { IErrorDetail } from '../../interfaces/error-detail.interface';
import { TypedHttpException } from './typed-http.exception';

class TypedHttpExceptionChild extends TypedHttpException {
  constructor(objectOrError?: string | IErrorDetail, message?: string) {
    super(objectOrError, message, 599);
  }
}

describe('TypedHttpException', () => {
  describe('TypedHttpException children', () => {
    it('should return the status', () => {
      expect(new TypedHttpExceptionChild().getStatus()).toBe(599);
    });
    it('should return error message', () => {
      expect(new TypedHttpExceptionChild('Bad Gateway').getResponse()).toEqual({
        title: 'Bad Gateway',
        status: 599,
      });
    });

    it('should return error message and details', () => {
      expect(
        new TypedHttpExceptionChild(
          'Bad Gateway',
          'Something went wrong'
        ).getResponse()
      ).toEqual({
        title: 'Bad Gateway',
        detail: 'Something went wrong',
        status: 599,
      });
    });

    it('should return rich error details', () => {
      // Example from: https://datatracker.ietf.org/doc/html/rfc7807#section-3
      const errDetails: IErrorDetail = {
        type: 'https://example.com/probs/out-of-credit',
        detail: 'Your current balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
        balance: 30,
        accounts: ['/account/12345', '/account/67890'],
      };

      const errorTitle = 'You do not have enough credit.';
      expect(
        new TypedHttpExceptionChild(errDetails, errorTitle).getResponse()
      ).toEqual({
        title: errorTitle,
        accounts: ['/account/12345', '/account/67890'],
        balance: 30,
        detail: 'Your current balance is 30, but that costs 50.',
        instance: '/account/12345/msgs/abc',
        type: 'https://example.com/probs/out-of-credit',
        status: 599,
      });
    });
  });
});
