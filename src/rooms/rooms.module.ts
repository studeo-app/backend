import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsDao } from '../daos/rooms.dao';
import { UsersDao } from '../daos/users.dao';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, RoomsDao, UsersDao],
  exports: [RoomsService, RoomsDao],
})
export class RoomsModule {}
