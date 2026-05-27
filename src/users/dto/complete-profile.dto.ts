import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator'
import { USERNAME_REGEX } from '../../common/utils/username.util'

export class CompleteProfileDto {
  @ApiProperty({ example: 'juanperez' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(USERNAME_REGEX, {
    message:
      'Username must be 3-20 characters and contain only lowercase letters, numbers, and underscores',
  })
  username: string

  @ApiPropertyOptional({
    example: 'https://lh3.googleusercontent.com/a/photo.jpg',
    description:
      'Required for manual registration. Optional for Google (defaults to Google photo).',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string
}
