import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('check-username/:username')
  @ApiOperation({
    summary: 'Check username availability',
    description:
      'Validates if a username is available before profile completion or registration confirmation.',
  })
  @ApiParam({
    name: 'username',
    description: 'Desired username to validate',
    example: 'juanperez',
  })
  @ApiOkResponse({
    description: 'Availability result',
    schema: {
      example: {
        username: 'juanperez',
        available: true,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Username is required or invalid' })
  checkUsername(@Param('username') username: string) {
    return this.authService.checkUsername(username)
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Manual registration (step 1)',
    description:
      'Creates Firebase Auth account and a Firestore profile stub with profileComplete=false. Username and avatar are completed later in /users/complete-profile.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Account created' })
  @ApiConflictResponse({ description: 'Email already registered' })
  @ApiBadRequestResponse({ description: 'Invalid email/password or malformed payload' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto)
  }
}
