import { Inject, Injectable } from '@nestjs/common';
import { IDragon } from '../interfaces/dragon.interface';

@Injectable()
export class DragonsService {
  constructor(@Inject('dragons') private readonly dragons: IDragon[]) {}

  getAll(): IDragon[] {
    return this.dragons;
  }

  getByIdOrNull(id: number): IDragon | null {
    return this.dragons.find((drg) => drg.id === id) || null;
  }
}
