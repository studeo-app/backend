import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getFirebaseAuth } from '../config/firebase.config';
import { UsersDao } from '../daos/users.dao';
import { splitDisplayName } from '../common/utils/name.util';
import { normalizeUsername } from '../common/utils/username.util';
import type { AuthProvider, User } from './entities/user.entity';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersDao: UsersDao) {}

  async checkUsername(username: string) {
    const normalized = normalizeUsername(username);

    if (!normalized) {
      throw new BadRequestException('Username is required');
    }

    const taken = await this.usersDao.isUsernameTaken(normalized);

    return {
      username: normalized,
      available: !taken,
    };
  }

  async getProfile(decoded: DecodedIdToken) {
    const user = await this.usersDao.findById(decoded.uid);
    const authProvider = this.resolveAuthProvider(decoded);

    if (!user || !user.profileComplete) {
      const { firstName, lastName } = splitDisplayName(decoded.name);

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
      };
    }

    return {
      profileComplete: true,
      needsProfile: false,
      authProvider,
      user,
      suggestedProfile: null,
    };
  }

  async completeProfile(decoded: DecodedIdToken, dto: CompleteProfileDto) {
    const authProvider = this.resolveAuthProvider(decoded);
    const existing = await this.usersDao.findById(decoded.uid);

    if (existing?.profileComplete) {
      throw new ConflictException('Profile is already complete');
    }

    const normalizedUsername = normalizeUsername(dto.username);
    const usernameTaken = await this.usersDao.isUsernameTaken(
      normalizedUsername,
      decoded.uid,
    );

    if (usernameTaken) {
      throw new ConflictException('Username is already taken');
    }

    let avatarUrl = dto.avatarUrl;

    if (!avatarUrl) {
      if (authProvider === 'google' && decoded.picture) {
        avatarUrl = decoded.picture;
      } else {
        throw new BadRequestException(
          'Avatar URL is required for manual accounts',
        );
      }
    }

    const { firstName, lastName } = existing
      ? { firstName: existing.firstName, lastName: existing.lastName }
      : splitDisplayName(decoded.name);

    try {
      const user = await this.usersDao.saveCompleteProfile({
        uid: decoded.uid,
        firstName,
        lastName,
        email: decoded.email ?? existing?.email ?? '',
        username: normalizedUsername,
        avatarUrl,
        authProvider,
      });

      await getFirebaseAuth()
        .updateUser(decoded.uid, {
          displayName: `${user.firstName} ${user.lastName}`.trim(),
          photoURL: user.avatarUrl,
        })
        .catch(() => undefined);

      return {
        profileComplete: true,
        user,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
        throw new ConflictException('Username is already taken');
      }

      throw error;
    }
  }

  async updateProfile(
    decoded: DecodedIdToken,
    dto: UpdateUserDto,
  ): Promise<User> {
    const uid = decoded.uid;
    const existing = await this.usersDao.findById(uid);
    if (!existing) {
      throw new NotFoundException(`User with id ${uid} was not found`);
    }

    if (dto.username) {
      const normalized = normalizeUsername(dto.username);
      const taken = await this.usersDao.isUsernameTaken(normalized, uid);

      if (taken) {
        throw new ConflictException('Username is already taken');
      }
    }

    try {
      const user = await this.usersDao.update(uid, {
        firstName: dto.firstName,
        lastName: dto.lastName,
        username: dto.username ? normalizeUsername(dto.username) : undefined,
        avatarUrl: dto.avatarUrl,
        profileComplete: existing.profileComplete,
      });

      await getFirebaseAuth()
        .updateUser(uid, {
          displayName: `${user.firstName} ${user.lastName}`.trim(),
          photoURL: user.avatarUrl,
        })
        .catch(() => undefined);

      return user;
    } catch (error) {
      if (error instanceof Error && error.message === 'USERNAME_TAKEN') {
        throw new ConflictException('Username is already taken');
      }

      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        throw new NotFoundException(`User with id ${uid} was not found`);
      }

      throw error;
    }
  }

  async deleteProfile(decoded: DecodedIdToken) {
    const uid = decoded.uid;
    const existing = await this.usersDao.findById(uid);
    if (!existing) {
      throw new NotFoundException(`User with id ${uid} was not found`);
    }

    try {
      // 1. Eliminar primero de Firestore (más seguro dejar Auth como respaldo temporal)
      await this.usersDao.delete(uid);

      // 2. Eliminar de Firebase Auth
      // Si el token es antiguo, esto lanzará auth/requires-recent-login
      await getFirebaseAuth().deleteUser(uid);

      return {
        deleted: true,
        message: 'Account deleted successfully',
      };
    } catch (error: any) {
      // Manejo explícito de reautenticación requerida (Escenario 3 US-05)
      if (error.code === 'auth/requires-recent-login') {
        throw new UnauthorizedException({
          message: 'Re-authentication required to delete account',
          code: 'REQUIRES_RECENT_LOGIN',
        });
      }

      // Si el usuario ya no existe en Auth pero sí en Firestore, consideramos éxito parcial
      if (error.code === 'auth/user-not-found') {
        return {
          deleted: true,
          message: 'Firestore profile deleted. Auth user was already removed.',
        };
      }

      throw error;
    }
  }

  private resolveAuthProvider(decoded: DecodedIdToken): AuthProvider {
    const provider = decoded.firebase?.sign_in_provider;

    if (provider === 'google.com') {
      return 'google';
    }

    return 'password';
  }
}
