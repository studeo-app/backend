import { Injectable } from '@nestjs/common';
import { getFirestore } from '../config/firebase.config';
import type { DocumentReference, UpdateData } from 'firebase-admin/firestore';
import {
  generateRoomCode,
  normalizeRoomCode,
} from '../rooms/utils/room-code.util';

const ROOMS_COLLECTION = 'rooms';
const ROOM_CODES_COLLECTION = 'roomCodes';
const MEMBERS_COLLECTION = 'members';
const MESSAGES_COLLECTION = 'messages';
const FIRESTORE_BATCH_LIMIT = 450;
const MAX_ROOM_CODE_ATTEMPTS = 10;

class RoomCodeCollisionError extends Error {
  constructor() {
    super('ROOM_CODE_COLLISION');
    this.name = 'RoomCodeCollisionError';
  }
}

export interface CreateRoomData {
  name: string;
  ownerUid: string;
  imageUrl?: string;
}

export interface Room {
  id: string;
  roomCode: string;
  name: string;
  ownerUid: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

export interface RoomCodeMapping {
  roomId: string;
}

export interface RoomMember {
  id: string;
  roomId: string;
  uid: string;
  joinedAt: string;
}

interface RoomMemberDocument {
  joinedAt: string;
}

export interface RoomMemberProfile extends RoomMember {
  displayName: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
}

@Injectable()
export class RoomsDao {
  private get rooms() {
    return getFirestore().collection(ROOMS_COLLECTION);
  }

  private get roomCodes() {
    return getFirestore().collection(ROOM_CODES_COLLECTION);
  }

  private roomMembers(roomId: string) {
    return this.rooms.doc(roomId).collection(MEMBERS_COLLECTION);
  }

  private roomMessages(roomId: string) {
    return this.rooms.doc(roomId).collection(MESSAGES_COLLECTION);
  }

  private docToRoom(
    id: string,
    data: FirebaseFirestore.DocumentData | undefined,
  ): Room | null {
    if (!data) return null;

    return {
      id,
      roomCode: String(data.roomCode ?? ''),
      name: String(data.name ?? ''),
      ownerUid: String(data.ownerUid ?? ''),
      createdAt: String(data.createdAt ?? ''),
      updatedAt: String(data.updatedAt ?? ''),
      imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
    };
  }

  async findRoomIdByCode(roomCode: string): Promise<string | null> {
    const normalizedCode = normalizeRoomCode(roomCode);
    if (!normalizedCode) return null;

    const snapshot = await this.roomCodes.doc(normalizedCode).get();
    if (!snapshot.exists) return null;

    const roomId = String(snapshot.data()?.roomId ?? '');
    return roomId || null;
  }

  async findById(roomId: string): Promise<Room | null> {
    const snapshot = await this.rooms.doc(roomId).get();
    if (!snapshot.exists) return null;
    return this.docToRoom(snapshot.id, snapshot.data());
  }

  async findByOwner(ownerUid: string): Promise<Room[]> {
    const snapshot = await this.rooms
      .where('ownerUid', '==', ownerUid)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => this.docToRoom(doc.id, doc.data())!);
  }

  async findByParticipant(uid: string): Promise<Room[]> {
    return this.findByParticipantWithoutIndex(uid);
  }

  private async findByParticipantWithoutIndex(uid: string): Promise<Room[]> {
    const snapshot = await this.rooms.get();
    const rooms = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const member = await this.roomMembers(doc.id).doc(uid).get();
        if (!member.exists) return null;

        return this.docToRoom(doc.id, doc.data());
      }),
    );

    return rooms.filter((room): room is Room => Boolean(room));
  }

  async create(data: CreateRoomData): Promise<Room> {
    const now = new Date().toISOString();
    const roomId = getFirestore().collection(ROOMS_COLLECTION).doc().id;
    const db = getFirestore();

    for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt++) {
      const roomCode = generateRoomCode();
      const room: Room = {
        id: roomId,
        roomCode,
        name: data.name,
        ownerUid: data.ownerUid,
        createdAt: now,
        updatedAt: now,
      };

      if (data.imageUrl) {
        room.imageUrl = data.imageUrl;
      }

      try {
        await db.runTransaction(async (transaction) => {
          const codeRef = this.roomCodes.doc(roomCode);
          const codeSnapshot = await transaction.get(codeRef);

          if (codeSnapshot.exists) {
            throw new RoomCodeCollisionError();
          }

          transaction.set(codeRef, { roomId } satisfies RoomCodeMapping);
          transaction.set(this.rooms.doc(roomId), room);
        });

        return room;
      } catch (err) {
        if (err instanceof RoomCodeCollisionError) {
          continue;
        }

        throw err;
      }
    }

    throw new Error('ROOM_CODE_GENERATION_FAILED');
  }

  async update(roomId: string, partial: Partial<Room>): Promise<Room> {
    const current = await this.findById(roomId);
    if (!current) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const now = new Date().toISOString();

    // ✅ Filtrar valores undefined del partial
    const cleanPartial = Object.fromEntries(
      Object.entries(partial).filter(([_, value]) => value !== undefined)
    );

    // ✅ Actualizar SOLO los campos que cambiaron (no el documento completo)
    await this.rooms.doc(roomId).update({
      ...cleanPartial,
      updatedAt: now,
    });

    // ✅ Retornar el objeto actualizado (combinando current + cambios)
    return {
      ...current,
      ...cleanPartial,
      updatedAt: now,
    };
  }

  async delete(roomId: string): Promise<void> {
    const current = await this.findById(roomId);
    if (!current) {
      throw new Error('ROOM_NOT_FOUND');
    }

    await this.deleteRoomDocuments(current);
  }

  async addParticipant(roomId: string, uid: string): Promise<Room> {
    const current = await this.findById(roomId);
    if (!current) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const member: RoomMemberDocument = {
      joinedAt: new Date().toISOString(),
    };

    await this.roomMembers(roomId).doc(uid).set(member);

    return this.findById(roomId) as Promise<Room>;
  }

  async removeParticipant(roomId: string, uid: string): Promise<Room> {
    const current = await this.findById(roomId);
    if (!current) {
      throw new Error('ROOM_NOT_FOUND');
    }

    await this.roomMembers(roomId).doc(uid).delete();

    return this.findById(roomId) as Promise<Room>;
  }

  async findMembers(roomId: string): Promise<RoomMember[]> {
    const snapshot = await this.roomMembers(roomId).orderBy('joinedAt', 'asc').get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        roomId,
        uid: doc.id,
        joinedAt: String(data.joinedAt ?? ''),
      };
    });
  }

  async deleteByOwner(ownerUid: string): Promise<void> {
    const rooms = await this.findByOwner(ownerUid);
    if (rooms.length === 0) return;

    for (const room of rooms) {
      await this.deleteRoomDocuments(room);
    }
  }

  private async deleteRoomDocuments(room: Room): Promise<void> {
    const docsToDelete: DocumentReference[] = [
      this.rooms.doc(room.id),
    ];

    if (room.roomCode) {
      docsToDelete.push(this.roomCodes.doc(room.roomCode));
    }

    const [members, messages] = await Promise.all([
      this.roomMembers(room.id).get(),
      this.roomMessages(room.id).get(),
    ]);

    docsToDelete.push(
      ...members.docs.map((doc) => doc.ref),
      ...messages.docs.map((doc) => doc.ref),
    );

    await this.commitDeletesInBatches(docsToDelete);
  }

  private async commitDeletesInBatches(refs: DocumentReference[]): Promise<void> {
    const db = getFirestore();

    for (let index = 0; index < refs.length; index += FIRESTORE_BATCH_LIMIT) {
      const batch = db.batch();
      refs.slice(index, index + FIRESTORE_BATCH_LIMIT).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  }
}

