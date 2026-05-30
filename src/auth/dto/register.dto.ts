import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'Juan', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string

  @ApiProperty({ example: 'Perez', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string
}

