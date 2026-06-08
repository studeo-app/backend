import { Injectable, NotFoundException } from '@nestjs/common';
import { getFirestore } from '../config/firebase.config';
import { RoomsDao } from '../daos/rooms.dao';

export interface ChatMessageResponse {
  id: string;
  uid: string;
  username: string;
  avatarUrl?: string | null;
  text: string;
  timestamp: string;
}

export interface PaginatedMessagesResponse {
  messages: ChatMessageResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class ChatService {
  constructor(private readonly roomsDao: RoomsDao) { }

  /**
   * Verifies if a room exists in the Firestore database.
   * Throws a NotFoundException if it does not exist.
   * @param roomId The unique identifier of the room.
   */
  async validateRoomExists(roomId: string): Promise<void> {
    const room = await this.roomsDao.findById(roomId);
    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }
  }

  /**
   * Retrieves message history for a given room, ordered chronologically.
   * Supports native cursor-based pagination.
   * 
   * @param roomId The room ID.
   * @param cursor Optional message ID of the cursor to start after.
   * @param limit Maximum number of messages to return (defaults to 50).
   * @returns A paginated response containing messages and metadata.
   */
  async getRoomMessages(
    roomId: string,
    cursor?: string,
    limit: number = 50,
  ): Promise<PaginatedMessagesResponse> {
    await this.validateRoomExists(roomId);

    const db = getFirestore();
    const messagesRef = db
      .collection('rooms')
      .doc(roomId)
      .collection('messages');

    let query = messagesRef.orderBy('timestamp', 'desc');

    if (cursor) {
      const cursorDoc = await messagesRef.doc(cursor).get();

      if (!cursorDoc.exists) {
        throw new NotFoundException(
          `Message cursor ${cursor} not found`,
        );
      }

      query = query.startAfter(cursorDoc);
    }


    const snapshot = await query.limit(limit + 1).get();

    if (snapshot.empty) {
      return {
        messages: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const activeDocs = hasMore ? docs.slice(0, limit) : docs;

    const messages: ChatMessageResponse[] = activeDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: String(data.uid ?? ''),
        username: String(data.username ?? ''),
        avatarUrl: data.avatarUrl ? String(data.avatarUrl) : null,
        text: String(data.text ?? ''),
        timestamp: String(data.timestamp ?? ''),
      };
    });

    // Revert the order to make it chronological (oldest first)
    messages.reverse();

    // The oldest message is the first one in the chronologically ordered list
    const nextCursor = messages.length > 0 ? messages[0].id : null;

    return {
      messages,
      nextCursor,
      hasMore,
    };
  }
}
