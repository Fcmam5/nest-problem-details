import { HttpStatus } from '@nestjs/common';
import { BadGatewayException } from './bad-gateway.exception';
describe('HTTP exceptions', () => {
  // TODO use .each
  describe('BadGatewayException', () => {
    it('should return create', () => {
      expect(new BadGatewayException().getResponse()).toEqual({
        title: 'Bad Gateway',
        status: HttpStatus.BAD_GATEWAY,
      });
    });
  });
});
