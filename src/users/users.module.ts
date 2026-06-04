import { Module } from '@nestjs/common'
import { RoomsModule } from '../rooms/rooms.module'
import { UsersDao } from '../daos/users.dao'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [RoomsModule],
  controllers: [UsersController],
  providers: [UsersService, UsersDao],
  exports: [UsersService, UsersDao],
})
export class UsersModule {}
