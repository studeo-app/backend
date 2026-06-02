import { Injectable } from '@nestjs/common';
import { getFirestore } from '../config/firebase.config';
import type { UpdateData } from 'firebase-admin/firestore';

const ROOMS_COLLECTION = 'rooms';

export interface CreateRoomData {
  name: string;
  ownerUid: string;
}

export interface Room {
  id: string;
  name: string;
  ownerUid: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class RoomsDao {
  private get rooms() {
    return getFirestore().collection(ROOMS_COLLECTION);
  }

  private docToRoom(
    id: string,
    data: FirebaseFirestore.DocumentData | undefined,
  ): Room | null {
    if (!data) return null;

    return {
      id,
      name: String(data.name ?? ''),
      ownerUid: String(data.ownerUid ?? ''),
      createdAt: String(data.createdAt ?? ''),
      updatedAt: String(data.updatedAt ?? ''),
    };
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

  async create(data: CreateRoomData): Promise<Room> {
    const now = new Date().toISOString();
    const roomId = getFirestore().collection(ROOMS_COLLECTION).doc().id;

    const room: Room = {
      id: roomId,
      name: data.name,
      ownerUid: data.ownerUid,
      createdAt: now,
      updatedAt: now,
    };

    await this.rooms.doc(roomId).set(room);
    return room;
  }

  async update(roomId: string, partial: Partial<Room>): Promise<Room> {
    const current = await this.findById(roomId);
    if (!current) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const updated: Room = {
      ...current,
      ...partial,
      updatedAt: now,
    };

    await this.rooms.doc(roomId).update(updated as UpdateData<Room>);
    return updated;
  }

  async delete(roomId: string): Promise<void> {
    const current = await this.findById(roomId);
    if (!current) {
      throw new Error('ROOM_NOT_FOUND');
    }

    await this.rooms.doc(roomId).delete();
  }
}
