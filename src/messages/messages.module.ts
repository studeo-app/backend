import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { RoomsModule } from '../rooms/rooms.module';
import { RoomsMessagesController } from './rooms-messages.controller';

@Module({
  imports: [RoomsModule],
  controllers: [RoomsMessagesController],
  providers: [ChatService],
  exports: [ChatService],
})
export class MessagesModule {}
