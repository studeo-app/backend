import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth/firebase-auth.guard';
import { ChatService, ChatMessageResponse, PaginatedMessagesResponse } from './chat.service';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class RoomsMessagesController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':roomId/messages')
  @ApiOperation({
    summary: 'Obtener historial de mensajes de una sala',
    description:
      'Retorna una respuesta paginada con hasta 50 mensajes de una sala específica, ordenados cronológicamente. Soporta paginación por cursor nativo usando el ID del mensaje.',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'ID del último mensaje recibido por el cliente para obtener la siguiente página de mensajes anteriores',
    example: 'msg_abc123',
  })
  @ApiOkResponse({
    description: 'Historial de mensajes paginado obtenido con éxito.',
    schema: {
      example: {
        messages: [
          {
            id: 'msg123',
            uid: 'user123',
            username: 'juanperez',
            avatarUrl: 'https://example.com/avatar.png',
            text: 'Hola a todos',
            timestamp: '2026-06-07T11:59:00.000Z',
          },
        ],
        nextCursor: 'msg123',
        hasMore: true,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'La sala especificada no existe.' })
  @ApiUnauthorizedResponse({
    description: 'Token de portador (Bearer token) inválido, ausente o expirado.',
  })
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('cursor') cursor?: string,
  ): Promise<PaginatedMessagesResponse> {
    return this.chatService.getRoomMessages(roomId, cursor);
  }
}
