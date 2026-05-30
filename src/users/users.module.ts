import { Module } from '@nestjs/common'
import { UsersDao } from '../daos/users.dao'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersDao],
  exports: [UsersService, UsersDao],
})
export class UsersModule {}
