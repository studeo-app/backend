import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Sala de Estudio Matemáticas Avanzadas' })
  @IsOptional()
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
  name?: string; // <-- Con "?" no da error porque ya es opcional

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
