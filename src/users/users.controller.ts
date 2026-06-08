import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  ApiParam,
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
  constructor(private readonly usersService: UsersService) { }

  @Get('check-username/:username')
  @ApiOperation({
    summary: 'Verificar disponibilidad de nombre de usuario',
    description:
      'Comprueba en Firestore si el nombre de usuario suministrado está libre o ya se encuentra registrado por otro usuario.',
  })
  @ApiParam({
    name: 'username',
    description: 'Nombre de usuario a validar',
    example: 'juanperez',
  })
  @ApiOkResponse({
    description: 'Resultado de la disponibilidad del nombre de usuario.',
    schema: {
      example: {
        username: 'juanperez',
        available: true,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Nombre de usuario vacío, inválido o malformado.' })
  checkUsername(@Param('username') username: string) {
    return this.usersService.checkUsername(username)
  }

  @Get('check-email/:email')
  @ApiOperation({
    summary: 'Verificar disponibilidad de correo electrónico',
    description:
      'Comprueba en Firestore si el correo electrónico suministrado está libre o ya se encuentra registrado por otro usuario.',
  })
  @ApiParam({
    name: 'email',
    description: 'Correo electrónico a validar',
    example: 'juanperez@universidad.edu',
  })
  @ApiOkResponse({
    description: 'Resultado de la disponibilidad del correo electrónico.',
    schema: {
      example: {
        email: 'juanperez@universidad.edu',
        available: true,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Correo electrónico vacío, inválido o malformado.' })
  checkEmail(@Param('email') email: string) {
    return this.usersService.checkEmail(email)
  }

  @Get('profile')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener estado del perfil del usuario autenticado',
    description:
      'Retorna el estado del perfil en la base de datos de Firestore. Si el perfil está incompleto (profileComplete=false), sugiere la información extraída del token de Firebase.',
  })
  @ApiOkResponse({
    description: 'Estado del perfil obtenido con éxito.',
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
  @ApiUnauthorizedResponse({ description: 'Token de portador (Bearer token) inválido, ausente o expirado.' })
  getProfile(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado')
    }

    return this.usersService.getProfile(req.user)
  }

  @Get('profile/basic')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener información básica del perfil del usuario autenticado (username, nombre y apellido)',
    description: 'Retorna solo el nombre de usuario (username), el nombre (firstName) y el apellido (lastName) del perfil.',
  })
  @ApiOkResponse({
    description: 'Información básica del perfil obtenida con éxito.',
    schema: {
      example: {
        username: 'juanperez',
        firstName: 'Juan',
        lastName: 'Perez',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token de portador (Bearer token) inválido, ausente o expirado.' })
  getBasicProfile(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado')
    }

    return this.usersService.getBasicProfile(req.user)
  }

  @Post('complete-profile')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Completar el registro del perfil del usuario',
    description:
      'Finaliza la creación del perfil en Firestore asignando un nombre de usuario único y un avatar. Para cuentas de Google, si no se envía avatarUrl, se usará la foto de perfil de Google por defecto.',
  })
  @ApiBody({
    type: CompleteProfileDto,
    description: 'Datos requeridos para completar el perfil.',
  })
  @ApiOkResponse({
    description: 'Perfil de usuario completado y guardado con éxito.',
    schema: {
      example: {
        profileComplete: true,
        user: {
          uid: 'abc123xyz',
          firstName: 'Juan',
          lastName: 'Perez',
          email: 'student@university.edu',
          username: 'juanperez',
          avatarUrl: 'https://example.com/mi-avatar-personalizado.png',
          authProvider: 'google',
          profileComplete: true,
          createdAt: '2026-05-26T18:00:00.000Z',
          updatedAt: '2026-05-26T18:10:00.000Z',
        },
      },
    },
  })
  @ApiConflictResponse({ description: 'El nombre de usuario ya está tomado o el perfil ya se encuentra completo.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o avatarUrl ausente en cuenta de registro manual.' })
  @ApiUnauthorizedResponse({ description: 'Token de portador (Bearer token) inválido, ausente o expirado.' })
  completeProfile(@Req() req: Request, @Body() dto: CompleteProfileDto) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado')
    }

    return this.usersService.completeProfile(req.user, dto)
  }

  @Patch('profile')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar datos del perfil de usuario',
    description:
      'Actualiza campos del perfil del usuario autenticado (nombre, apellido, email, username o avatar). Valida que no existan colisiones de correo o nombre de usuario.',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'Campos opcionales a modificar en el perfil.',
  })
  @ApiOkResponse({
    description: 'Perfil actualizado con éxito.',
    schema: {
      example: {
        uid: 'abc123xyz',
        firstName: 'Juan Modificado',
        lastName: 'Perez',
        email: 'nuevo.correo@university.edu',
        username: 'juanpereznuevo',
        avatarUrl: 'https://example.com/nuevo-avatar.png',
        authProvider: 'password',
        profileComplete: true,
        createdAt: '2026-05-26T18:00:00.000Z',
        updatedAt: '2026-05-29T12:00:00.000Z',
      },
    },
  })
  @ApiConflictResponse({
    description: 'El correo electrónico o nombre de usuario solicitado ya está en uso por otra cuenta.',
  })
  @ApiBadRequestResponse({ description: 'El payload enviado contiene campos inválidos o mal formateados.' })
  @ApiUnauthorizedResponse({ description: 'Token de portador (Bearer token) inválido, ausente o expirado.' })
  updateProfile(@Req() req: Request, @Body() dto: UpdateUserDto) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado')
    }

    return this.usersService.updateProfile(req.user, dto)
  }

  @Delete('profile')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar cuenta y perfil del usuario',
    description:
      'Elimina de forma permanente el documento del perfil de Firestore, el nombre de usuario reservado y la cuenta del sistema de Firebase Auth.',
  })
  @ApiOkResponse({
    description: 'Cuenta y perfil eliminados correctamente.',
    schema: {
      example: {
        deleted: true,
        message: 'Account deleted successfully',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token de portador (Bearer token) inválido, ausente o expirado.' })
  deleteProfile(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado')
    }

    return this.usersService.deleteProfile(req.user)
  }
}
