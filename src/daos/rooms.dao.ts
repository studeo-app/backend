import { Injectable } from '@nestjs/common';
import { getFirestore } from '../config/firebase.config';
import type { UpdateData } from 'firebase-admin/firestore';

const ROOMS_COLLECTION = 'rooms';
const MEMBERS_COLLECTION = 'miembros';

export interface CreateRoomData {
  name: string;
  ownerUid: string;
  imageUrl?: string;
}

export interface Room {
  id: string;
  name: string;
  ownerUid: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

export interface RoomMember {
  id: string;
  roomId: string;
  uid: string;
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

  private get members() {
    return getFirestore().collectionGroup(MEMBERS_COLLECTION);
  }

  private roomMembers(roomId: string) {
    return this.rooms.doc(roomId).collection(MEMBERS_COLLECTION);
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
      imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
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

  async findByParticipant(uid: string): Promise<Room[]> {
    let snapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    try {
      snapshot = await this.members.where('uid', '==', uid).get();
    } catch (err) {
      if (this.isMissingCollectionGroupIndexError(err)) {
        return this.findByParticipantWithoutIndex(uid);
      }

      throw err;
    }

    if (snapshot.empty) return [];

    const roomIds = snapshot.docs.map((doc) => String(doc.data().roomId ?? ''));
    const uniqueRoomIds = Array.from(new Set(roomIds.filter(Boolean)));
    const rooms = await Promise.all(uniqueRoomIds.map((roomId) => this.findById(roomId)));

    return rooms.filter((room): room is Room => Boolean(room));
  }

  private isMissingCollectionGroupIndexError(err: unknown): boolean {
    const maybeError = err as { code?: number; details?: string; message?: string };
    const message = `${maybeError.details ?? ''} ${maybeError.message ?? ''}`;

    return (
      maybeError.code === 9 &&
      message.includes('COLLECTION_GROUP_ASC') &&
      message.includes(MEMBERS_COLLECTION)
    );
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

    const room: Room = {
      id: roomId,
      name: data.name,
      ownerUid: data.ownerUid,
      createdAt: now,
      updatedAt: now,
    };

    if (data.imageUrl) {
      room.imageUrl = data.imageUrl;
    }

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

    const db = getFirestore();
    const batch = db.batch();
    const members = await this.roomMembers(roomId).get();

    members.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(this.rooms.doc(roomId));

    await batch.commit();
  }

  async addParticipant(roomId: string, uid: string): Promise<Room> {
    const current = await this.findById(roomId);
    if (!current) {
      throw new Error('ROOM_NOT_FOUND');
    }

    const member: RoomMember = {
      id: uid,
      roomId,
      uid,
      joinedAt: new Date().toISOString(),
    };

    await this.roomMembers(roomId).doc(uid).set(member, { merge: true });

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
        roomId: String(data.roomId ?? roomId),
        uid: String(data.uid ?? doc.id),
        joinedAt: String(data.joinedAt ?? ''),
      };
    });
  }

  async deleteByOwner(ownerUid: string): Promise<void> {
    const rooms = await this.findByOwner(ownerUid);
    if (rooms.length === 0) return;

    const db = getFirestore();
    const batch = db.batch();

    for (const room of rooms) {
      const members = await this.roomMembers(room.id).get();
      members.docs.forEach((doc) => batch.delete(doc.ref));
      batch.delete(this.rooms.doc(room.id));
    }

    await batch.commit();
  }
}

