import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator'
import { USERNAME_REGEX } from '../../common/utils/username.util'

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string

  @ApiPropertyOptional({ example: 'Perez' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string

  @ApiPropertyOptional({ example: 'juanperez' })
  @IsOptional()
  @IsString()
  @Matches(USERNAME_REGEX, {
    message:
      'Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores',
  })
  username?: string

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string

  @ApiPropertyOptional({ example: 'juan.perez@universidad.edu' })
  @IsOptional()
  @IsEmail()
  email?: string
}
