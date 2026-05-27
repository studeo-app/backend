import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { getFirebaseAuth } from '../config/firebase.config'
import { UsersDao } from '../daos/users.dao'
import { splitDisplayName } from '../common/utils/name.util'
import { normalizeUsername } from '../common/utils/username.util'
import type { AuthProvider, User } from './entities/user.entity'
import { CompleteProfileDto } from './dto/complete-profile.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  constructor(private readonly usersDao: UsersDao) {}

  async getProfile(decoded: DecodedIdToken) {
    const user = await this.usersDao.findById(decoded.uid)
    const authProvider = this.resolveAuthProvider(decoded)

    if (!user || !user.profileComplete) {
      const { firstName, lastName } = splitDisplayName(decoded.name)

      return {
        profileComplete: false,
        needsProfile: true,
        authProvider,
        user,
        suggestedProfile: {
          email: decoded.email ?? '',
          firstName: firstName || user?.firstName || '',
          lastName: lastName || user?.lastName || '',
          avatarUrl: decoded.picture ?? user?.avatarUrl ?? '',
        },
      }
    }

    return {
      profileComplete: true,
      needsProfile: false,
      authProvider,
      user,
      suggestedProfile: null,
    }
  }

  async completeProfile(decoded: DecodedIdToken, dto: CompleteProfileDto) {
    const authProvider = this.resolveAuthProvider(decoded)
    const existing = await this.usersDao.findById(decoded.uid)

    if (existing?.profileComplete) {
      throw new ConflictException('Profile is already complete')
    }

    const normalizedUsername = normalizeUsername(dto.username)
    const usernameTaken = await this.usersDao.isUsernameTaken(
      normalizedUsername,
      decoded.uid,
    )

    if (usernameTaken) {
      throw new ConflictException('Username is already taken')
    }

    let avatarUrl = dto.avatarUrl

    if (!avatarUrl) {
      if (authProvider === 'google' && decoded.picture) {
        avatarUrl = decoded.picture
      } else {
        throw new BadRequestException('Avatar URL is required for manual accounts')
      }
    }

    const { firstName, lastName } = existing
      ? { firstName: existing.firstName, lastName: existing.lastName }
      : splitDisplayName(decoded.name)

    try {
      const user = await this.usersDao.saveCompleteProfile({
        uid: decoded.uid,
        firstName,
        lastName,
        email: decoded.email ?? existing?.email ?? '',
        username: normalizedUsername,
        avatarUrl,
        authProvider,
      })

      await getFirebaseAuth()
        .updateUser(decoded.uid, {
          displayName: `${user.firstName} ${user.lastName}`.trim(),
          photoURL: user.avatarUrl,
        })
        .catch(() => undefined)

      return {
        profileComplete: true,
        user,
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
        throw new ConflictException('Username is already taken')
      }

      throw error
    }
  }

  async updateProfile(
    decoded: DecodedIdToken,
    dto: UpdateUserDto,
  ): Promise<User> {
    const uid = decoded.uid
    const existing = await this.usersDao.findById(uid)
    if (!existing) {
      throw new NotFoundException(`User with id ${uid} was not found`)
    }

    if (dto.username) {
      const normalized = normalizeUsername(dto.username)
      const taken = await this.usersDao.isUsernameTaken(normalized, uid)

      if (taken) {
        throw new ConflictException('Username is already taken')
      }
    }

    if (dto.email) {
      const owner = await this.findUidByEmail(dto.email)
      if (owner && owner !== uid) {
        throw new ConflictException('Email is already in use')
      }
    }

    try {
      const user = await this.usersDao.update(uid, {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        username: dto.username ? normalizeUsername(dto.username) : undefined,
        avatarUrl: dto.avatarUrl,
        profileComplete: existing.profileComplete,
      })

      await getFirebaseAuth()
        .updateUser(uid, {
          email: user.email,
          displayName: `${user.firstName} ${user.lastName}`.trim(),
          photoURL: user.avatarUrl,
        })
        .catch(() => undefined)

      return user
    } catch (error) {
      if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
        throw new ConflictException('Username is already taken')
      }

      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        throw new NotFoundException(`User with id ${uid} was not found`)
      }

      throw error
    }
  }

  async deleteProfile(decoded: DecodedIdToken) {
    const uid = decoded.uid
    const existing = await this.usersDao.findById(uid)
    if (!existing) {
      throw new NotFoundException(`User with id ${uid} was not found`)
    }

    try {
      await this.usersDao.delete(uid)
      await getFirebaseAuth().deleteUser(uid).catch(() => undefined)
      return {
        deleted: true,
        message: 'Account deleted successfully',
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        throw new NotFoundException(`User with id ${uid} was not found`)
      }

      throw error
    }
  }

  private resolveAuthProvider(decoded: DecodedIdToken): AuthProvider {
    const provider = decoded.firebase?.sign_in_provider

    if (provider === 'google.com') {
      return 'google'
    }

    return 'password'
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
