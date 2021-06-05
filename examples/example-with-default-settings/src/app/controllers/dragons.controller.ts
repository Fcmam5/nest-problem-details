import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  IDragonListResponse,
  IDragonResponse,
} from '../interfaces/dragon.interface';
import { DragonsService } from '../services/dragons.service';

@Controller('dragons')
export class DragonsController {
  constructor(private readonly service: DragonsService) {}

  @Get()
  getAll(): IDragonListResponse {
    return { dragons: this.service.getAll() };
  }

  @Get('/:dragonId')
  getOneById(
    @Param('dragonId', ParseIntPipe) dragonId: number
  ): IDragonResponse {
    const dragon = this.service.getByIdOrNull(dragonId);
    if (dragon) {
      return { dragon };
    }

    throw new NotFoundException();
  }
}
