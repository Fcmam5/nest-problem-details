import { Provider } from '@nestjs/common';
import { dragons } from '../../../data.mock.json';

export const dragonsProvider: Provider = {
  provide: 'dragons',
  useValue: dragons,
};
