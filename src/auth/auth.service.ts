import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import { getFirebaseAuth } from '../config/firebase.config'
import { UsersDao } from '../daos/users.dao'
import { normalizeUsername } from '../common/utils/username.util'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(private readonly usersDao: UsersDao) {}

  async checkUsername(username: string) {
    const normalized = normalizeUsername(username)

    if (!normalized) {
      throw new BadRequestException('Username is required')
    }

    const taken = await this.usersDao.isUsernameTaken(normalized)

    return {
      username: normalized,
      available: !taken,
    }
  }

  async register(dto: RegisterDto) {
    const existingUid = await this.findUidByEmail(dto.email)
    if (existingUid) {
      throw new ConflictException('Email is already registered')
    }

    let uid: string

    try {
      const userRecord = await getFirebaseAuth().createUser({
        email: dto.email,
        password: dto.password,
        displayName: `${dto.firstName} ${dto.lastName}`.trim(),
      })
      uid = userRecord.uid
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Registration failed'

      if (message.includes('email-already-exists')) {
        throw new ConflictException('Email is already registered')
      }

      throw new BadRequestException(message)
    }

    try {
      const profile = await this.usersDao.createStub({
        uid,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        authProvider: 'password',
      })

      return {
        uid,
        profileComplete: profile.profileComplete,
        message:
          'Account created. Complete your profile with username and avatar.',
      }
    } catch (error) {
      await getFirebaseAuth().deleteUser(uid).catch(() => undefined)
      throw new InternalServerErrorException(
        'Account was created but profile could not be saved',
      )
    }
  }

  private async findUidByEmail(email: string): Promise<string | null> {
    try {
      const user = await getFirebaseAuth().getUserByEmail(email)
      return user.uid
    } catch {
      return null
    }
  }
}
