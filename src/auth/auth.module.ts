import { Module } from '@nestjs/common'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { FirebaseAuthGuard } from './guards/firebase-auth/firebase-auth.guard'

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, FirebaseAuthGuard],
  exports: [FirebaseAuthGuard],
})
export class AuthModule {}
