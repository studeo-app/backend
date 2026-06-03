import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsDao } from '../daos/rooms.dao';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, RoomsDao],
  exports: [RoomsService, RoomsDao],
})
export class RoomsModule {}
