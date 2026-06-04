import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches, IsOptional, IsUrl } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    example: 'Sala de Estudio Matemáticas',
    description: 'Nombre de la sala',
  })
  @IsString()
  @MinLength(3, {
    message: 'El nombre de la sala debe tener al menos 3 caracteres',
  })
  @MaxLength(50, {
    message: 'El nombre de la sala no puede exceder 50 caracteres',
  })
  @Matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/, {
    message:
      'El nombre de la sala solo puede contener letras, números y espacios',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/...',
    description: 'URL de la imagen de portada de la sala',
  })
  @IsString()
  @IsUrl({}, { message: 'La imagen de portada debe ser una URL válida' })
  @IsOptional()
  imageUrl?: string;
}
