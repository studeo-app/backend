import {
  Injectable,
} from '@nestjs/common'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { UsersDao } from '../daos/users.dao'
import { splitDisplayName } from '../common/utils/name.util'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(private readonly usersDao: UsersDao) {}

  async registerOrSync(decoded: DecodedIdToken, dto: RegisterDto) {
    const uid = decoded.uid
    const existing = await this.usersDao.findById(uid)

    if (existing) {
      return {
        uid,
        profileComplete: existing.profileComplete,
        user: existing,
        message: 'Profile already synchronized.',
      }
    }

    const provider = decoded.firebase?.sign_in_provider === 'google.com' ? 'google' : 'password'

    let firstName = dto.firstName
    let lastName = dto.lastName

    if (!firstName && !lastName) {
      const split = splitDisplayName(decoded.name)
      firstName = split.firstName
      lastName = split.lastName
    }

    const profile = await this.usersDao.createStub({
      uid,
      firstName: firstName || '',
      lastName: lastName || '',
      email: decoded.email ?? '',
      authProvider: provider,
    })

    return {
      uid,
      profileComplete: profile.profileComplete,
      user: profile,
      message: 'Profile registered and stub created.',
    }
  }
}

