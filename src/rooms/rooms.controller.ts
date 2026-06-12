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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiTags,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth/firebase-auth.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) { }

  @Post()
  @ApiOperation({
    summary: 'Crear una nueva sala',
    description:
      'Crea una nueva sala de estudio y asigna automáticamente al usuario autenticado como anfitrión. Genera un ID único para la sala.',
  })
  @ApiBody({
    type: CreateRoomDto,
    description: 'Datos requeridos para crear la sala.',
  })
  @ApiCreatedResponse({
    description: 'Sala creada exitosamente.',
    schema: {
      example: {
        id: 'abc123xyz',
        roomCode: 'A7K9XQ',
        name: 'Sala de Estudio Matemáticas',
        ownerUid: 'user123',
        createdAt: '2026-06-02T10:00:00.000Z',
        updatedAt: '2026-06-02T10:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no suministrado.' })
  async createRoom(@Req() req: Request, @Body() dto: CreateRoomDto) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado');
    }

    return this.roomsService.createRoom(req.user, dto);
  }

  @Get('my-rooms')
  @ApiOperation({
    summary: 'Obtener mis salas',
    description:
      'Retorna una lista de todas las salas creadas por el usuario autenticado, ordenadas por fecha de creación (más recientes primero).',
  })
  @ApiOkResponse({
    description: 'Lista de salas del usuario.',
    schema: {
      example: [
        {
          id: 'abc123xyz',
          roomCode: 'A7K9XQ',
          name: 'Sala de Estudio Matemáticas',
          ownerUid: 'user123',
          createdAt: '2026-06-02T10:00:00.000Z',
          updatedAt: '2026-06-02T10:00:00.000Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no suministrado.' })
  async getMyRooms(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado');
    }

    return this.roomsService.getMyRooms(req.user);
  }

  @Post('join')
  @ApiOperation({
    summary: 'Unirse a una sala por código',
    description:
      'Resuelve el código de acceso en roomCodes, agrega la sala al dashboard del usuario autenticado como participante y devuelve la sala.',
  })
  @ApiBody({
    type: JoinRoomDto,
    description: 'Código alfanumérico de 6 caracteres de la sala.',
  })
  @ApiOkResponse({ description: 'Sala agregada al dashboard del usuario.' })
  @ApiNotFoundResponse({ description: 'Sala no encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no suministrado.' })
  async joinRoomByCode(@Req() req: Request, @Body() dto: JoinRoomDto) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado');
    }

    return this.roomsService.joinRoomByCode(req.user, dto);
  }

  @Get('my-rooms/members')
  @ApiOperation({
    summary: 'Obtener miembros de mis salas',
    description:
      'Retorna un mapa de roomId a miembros para todas las salas del dashboard del usuario.',
  })
  @ApiOkResponse({ description: 'Mapa de miembros por sala.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no suministrado.' })
  async getMyRoomsMembers(@Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado');
    }

    return this.roomsService.getMyRoomsMembers(req.user);
  }

  @Get(':roomId/members')
  @ApiOperation({
    summary: 'Obtener miembros de una sala',
    description:
      'Retorna los usuarios que aparecen en la subcoleccion members de la sala, incluyendo al propietario.',
  })
  @ApiParam({
    name: 'roomId',
    description: 'ID único de la sala',
    example: 'abc123xyz',
  })
  @ApiOkResponse({ description: 'Lista de miembros de la sala.' })
  @ApiNotFoundResponse({ description: 'Sala no encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no suministrado.' })
  async getRoomMembers(@Req() req: Request, @Param('roomId') roomId: string) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado');
    }

    return this.roomsService.getRoomMembers(req.user, roomId);
  }

  @Get(':roomId')
  @ApiOperation({
    summary: 'Obtener detalles de una sala',
    description:
      'Retorna la información completa de una sala específica por su ID.',
  })
  @ApiParam({
    name: 'roomId',
    description: 'ID único de la sala',
    example: 'abc123xyz',
  })
  @ApiOkResponse({
    description: 'Detalles de la sala.',
    schema: {
      example: {
        id: 'abc123xyz',
        roomCode: 'A7K9XQ',
        name: 'Sala de Estudio Matemáticas',
        ownerUid: 'user123',
        createdAt: '2026-06-02T10:00:00.000Z',
        updatedAt: '2026-06-02T10:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Sala no encontrada.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no suministrado.' })
  async getRoomById(@Req() req: Request, @Param('roomId') roomId: string) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado');
    }

    return this.roomsService.getRoomById(req.user, roomId);
  }

  @Patch(':roomId')
  @ApiOperation({
    summary: 'Editar una sala',
    description:
      'Permite al anfitrión editar el nombre de la sala. Solo el propietario puede realizar esta acción.',
  })
  @ApiParam({
    name: 'roomId',
    description: 'ID único de la sala',
    example: 'abc123xyz',
  })
  @ApiBody({
    type: UpdateRoomDto,
    description: 'Campos opcionales a modificar.',
  })
  @ApiOkResponse({
    description: 'Sala actualizada exitosamente.',
    schema: {
      example: {
        id: 'abc123xyz',
        roomCode: 'A7K9XQ',
        name: 'Sala de Estudio Matemáticas Avanzadas',
        ownerUid: 'user123',
        createdAt: '2026-06-02T10:00:00.000Z',
        updatedAt: '2026-06-02T11:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Sala no encontrada.' })
  @ApiForbiddenResponse({
    description: 'Solo el propietario puede editar esta sala.',
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no suministrado.' })
  async updateRoom(
    @Req() req: Request,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado');
    }

    return this.roomsService.updateRoom(req.user, roomId, dto);
  }

  @Delete(':roomId/membership')
  @ApiOperation({
    summary: 'Quitar una sala del dashboard',
    description:
      'Permite a un participante quitar la sala de su dashboard sin borrar la sala para los demás usuarios.',
  })
  @ApiParam({
    name: 'roomId',
    description: 'ID único de la sala',
    example: 'abc123xyz',
  })
  @ApiOkResponse({
    description: 'Sala quitada del dashboard del participante.',
    schema: {
      example: {
        removed: true,
        message: 'Room removed from dashboard',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Sala no encontrada.' })
  @ApiForbiddenResponse({
    description: 'El propietario no puede quitar su propia sala por esta ruta.',
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no suministrado.' })
  async removeMembership(
    @Req() req: Request,
    @Param('roomId') roomId: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado');
    }

    await this.roomsService.removeMembership(req.user, roomId);
    return {
      removed: true,
      message: 'Room removed from dashboard',
    };
  }

  @Delete(':roomId')
  @ApiOperation({
    summary: 'Eliminar una sala',
    description:
      'Elimina permanentemente una sala, sus subcolecciones messages y members, y su codigo en roomCodes. Solo el anfitrion puede realizar esta accion.',
  })
  @ApiParam({
    name: 'roomId',
    description: 'ID único de la sala',
    example: 'abc123xyz',
  })
  @ApiOkResponse({
    description: 'Sala eliminada exitosamente.',
    schema: {
      example: {
        deleted: true,
        message: 'Room deleted successfully',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Sala no encontrada.' })
  @ApiForbiddenResponse({
    description: 'Solo el propietario puede eliminar esta sala.',
  })
  @ApiUnauthorizedResponse({ description: 'Token inválido o no suministrado.' })
  async deleteRoom(@Req() req: Request, @Param('roomId') roomId: string) {
    if (!req.user) {
      throw new UnauthorizedException('Token inválido o no suministrado');
    }

    await this.roomsService.deleteRoom(req.user, roomId);
    return {
      deleted: true,
      message: 'Room deleted successfully',
    };
  }
}
