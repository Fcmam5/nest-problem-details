import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
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

  @Get('/:id')
  getOneById(
    @Param('id', ParseIntPipe) id: number,
    @Query('title') hasTitle?: boolean,
    @Query('details') hasDetails?: boolean
    // @Query('has-details') hasDetails?: boolean,
  ): IDragonResponse {
    const dragon = this.service.getByIdOrNull(id);
    if (dragon) {
      return { dragon };
    }
    
    if (hasTitle && hasDetails) {
      throw new NotFoundException(
        'Dragon not found',
        `Could not find any dragon with ID: ${id}`
      );
    }
    
    if (hasTitle) {
      throw new NotFoundException('Dragon not found');
    }

    

    throw new NotFoundException();
  }
}
