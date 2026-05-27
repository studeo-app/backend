import { ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string

  @ApiProperty({ example: 'Perez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string

  @ApiProperty({ example: 'juan.perez@universidad.edu' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string
}
