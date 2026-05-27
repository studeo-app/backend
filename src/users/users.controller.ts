import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { Request } from 'express'
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth/firebase-auth.guard'
import { UsersService } from './users.service'
import { CompleteProfileDto } from './dto/complete-profile.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get authenticated user profile status',
    description:
      'Returns profile completion state for the current authenticated user. If incomplete, it includes suggested profile data from the token (Google/manual).',
  })
  @ApiOkResponse({
    description: 'Profile status resolved successfully',
    schema: {
      example: {
        profileComplete: false,
        needsProfile: true,
        authProvider: 'google',
        user: null,
        suggestedProfile: {
          email: 'student@university.edu',
          firstName: 'Juan',
          lastName: 'Perez',
          avatarUrl: 'https://lh3.googleusercontent.com/a/photo.jpg',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  getProfile(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('Invalid token')
    }

    return this.usersService.getProfile(req.user)
  }

  @Post('complete-profile')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete user profile with username and avatar',
    description:
      'Finalizes profile after registration/login. For manual accounts avatarUrl is required. For Google accounts avatarUrl can be omitted and Google picture will be used.',
  })
  @ApiBody({ type: CompleteProfileDto })
  @ApiOkResponse({
    description: 'Profile completed successfully',
    schema: {
      example: {
        profileComplete: true,
        user: {
          uid: 'abc123',
          firstName: 'Juan',
          lastName: 'Perez',
          email: 'student@university.edu',
          username: 'juanperez',
          avatarUrl: 'https://example.com/avatar.png',
          authProvider: 'google',
          profileComplete: true,
          createdAt: '2026-05-26T18:00:00.000Z',
          updatedAt: '2026-05-26T18:10:00.000Z',
        },
      },
    },
  })
  @ApiConflictResponse({ description: 'Username already taken or profile already complete' })
  @ApiBadRequestResponse({ description: 'Invalid data or avatar required for manual account' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  completeProfile(@Req() req: Request, @Body() dto: CompleteProfileDto) {
    if (!req.user) {
      throw new UnauthorizedException('Invalid token')
    }

    return this.usersService.completeProfile(req.user, dto)
  }

  @Patch('profile')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update authenticated user profile',
    description:
      'Updates profile data for the authenticated user. Validates username/email collisions.',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({
    description: 'Profile updated successfully',
  })
  @ApiConflictResponse({
    description: 'Username or email already in use',
  })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  updateProfile(@Req() req: Request, @Body() dto: UpdateUserDto) {
    if (!req.user) {
      throw new UnauthorizedException('Invalid token')
    }

    return this.usersService.updateProfile(req.user, dto)
  }

  @Delete('profile')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete authenticated user account',
    description:
      'Deletes the authenticated user profile from Firestore and removes the account from Firebase Auth.',
  })
  @ApiOkResponse({
    description: 'Account deleted successfully',
    schema: {
      example: {
        deleted: true,
        message: 'Account deleted successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  deleteProfile(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('Invalid token')
    }

    return this.usersService.deleteProfile(req.user)
  }
}
