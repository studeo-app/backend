import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { firebaseAdmin } from '../../../config/firebase.config'

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = request.headers.authorization?.split('Bearer ')[1]

    if (!token) throw new UnauthorizedException('Token no proporcionado')

    try {
      const decoded = await firebaseAdmin.auth().verifyIdToken(token)
      request.user = decoded
      return true
    } catch {
      throw new UnauthorizedException('Token inválido o expirado')
    }
  }
}