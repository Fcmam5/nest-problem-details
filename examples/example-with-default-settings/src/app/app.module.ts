import { Module } from '@nestjs/common';

import { DragonsController } from './controllers/dragons.controller';
import { DragonsService } from './services/dragons.service';
import { dragonsProvider } from './providers/dragons.provider';

@Module({
  imports: [],
  controllers: [DragonsController],
  providers: [DragonsService, dragonsProvider],
})
export class AppModule {}
