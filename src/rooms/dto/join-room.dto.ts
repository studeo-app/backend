import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class JoinRoomDto {
  @ApiProperty({
    description: 'Código alfanumérico de 6 caracteres de la sala',
    example: 'A7K9XQ',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9]{6}$/, {
    message: 'roomCode debe ser un código alfanumérico de 6 caracteres',
  })
  roomCode!: string;
}
