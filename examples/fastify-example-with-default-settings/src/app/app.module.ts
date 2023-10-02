import { Module } from '@nestjs/common';

import { DragonsController } from './controllers/dragons.controller';
import { DragonsService } from './services/dragons.service';
import { dragonsProvider } from './providers/dragons.provider';
import {
  NestProblemDetailsModule,
  HTTP_EXCEPTION_FILTER_KEY,
} from 'nest-problem-details-filter';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [NestProblemDetailsModule],
  controllers: [DragonsController],
  providers: [
    {
      provide: APP_FILTER,
      useExisting: HTTP_EXCEPTION_FILTER_KEY,
    },
    DragonsService,
    dragonsProvider,
  ],
})
export class AppModule {}
