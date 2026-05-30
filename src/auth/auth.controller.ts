import { Body, Controller, HttpCode, HttpStatus, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import type { Request } from 'express'
import { FirebaseAuthGuard } from './guards/firebase-auth/firebase-auth.guard'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar o sincronizar usuario autenticado',
    description:
      'Valida el token de Firebase Auth del usuario. Si el usuario no existe en Firestore, crea un perfil inicial (stub) con profileComplete=false. Si ya existe, retorna el perfil actual.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'Datos del usuario para el registro inicial (opcionales para inicio con Google).',
  })
  @ApiOkResponse({
    description: 'Perfil registrado o sincronizado con éxito.',
    schema: {
      example: {
        uid: 'abc123xyz',
        profileComplete: false,
        message: 'Profile registered and stub created.',
        user: {
          uid: 'abc123xyz',
          firstName: 'Juan',
          lastName: 'Perez',
          email: 'juan.perez@university.edu',
          authProvider: 'password',
          profileComplete: false,
          createdAt: '2026-05-29T12:00:00.000Z',
          updatedAt: '2026-05-29T12:00:00.000Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token de portador (Bearer token) inválido, expirado o faltante.',
  })
  @ApiResponse({
    status: 400,
    description: 'Petición malformada o payload inválido.',
  })
  register(@Req() req: Request, @Body() registerDto: RegisterDto) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado')
    }
    return this.authService.registerOrSync(req.user, registerDto)
  }
}

