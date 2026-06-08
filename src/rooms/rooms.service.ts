import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { RoomsDao, CreateRoomData, Room, RoomMemberProfile } from '../daos/rooms.dao';
import { UsersDao } from '../daos/users.dao';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsDao: RoomsDao,
    private readonly usersDao: UsersDao,
  ) {}
  async createRoom(decoded: DecodedIdToken, dto: CreateRoomDto): Promise<Room> {
    const cleanName = dto.name.trim().replace(/\s+/g, ' ');
    const createData: CreateRoomData = {
      name: cleanName,
      ownerUid: decoded.uid,
      imageUrl: dto.imageUrl,
    };

    return this.roomsDao.create(createData);
  }
  async getMyRooms(decoded: DecodedIdToken): Promise<Room[]> {
    const [ownedRooms, participantRooms] = await Promise.all([
      this.roomsDao.findByOwner(decoded.uid),
      this.roomsDao.findByParticipant(decoded.uid),
    ]);

    return Array.from(
      new Map([...ownedRooms, ...participantRooms].map((room) => [room.id, room])).values(),
    ).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getRoomById(decoded: DecodedIdToken, roomId: string): Promise<Room> {
    const room = await this.roomsDao.findById(roomId);

    if (!room) {
      throw new NotFoundException(`Room with id ${roomId} was not found`);
    }

    return room;
  }

  async updateRoom(
    decoded: DecodedIdToken,
    roomId: string,
    dto: UpdateRoomDto,
  ): Promise<Room> {
    const room = await this.roomsDao.findById(roomId);

    if (!room) {
      throw new NotFoundException(`Room with id ${roomId} was not found`);
    }

    // Solo el anfitrión puede editar la sala
    if (room.ownerUid !== decoded.uid) {
      throw new ForbiddenException('Only the room owner can update this room');
    }

    const updateData: Partial<Room> = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }
    if (dto.imageUrl !== undefined) {
      const cleanImageUrl = dto.imageUrl.trim();
      updateData.imageUrl = cleanImageUrl;
    }

    return this.roomsDao.update(roomId, updateData);
  }

  async deleteRoom(decoded: DecodedIdToken, roomId: string): Promise<void> {
    const room = await this.roomsDao.findById(roomId);

    if (!room) {
      throw new NotFoundException(`Room with id ${roomId} was not found`);
    }

    // Solo el anfitrión puede eliminar la sala
    if (room.ownerUid !== decoded.uid) {
      throw new ForbiddenException('Only the room owner can delete this room');
    }

    await this.roomsDao.delete(roomId);
  }

  async joinRoom(decoded: DecodedIdToken, roomId: string): Promise<Room> {
    const room = await this.roomsDao.findById(roomId);

    if (!room) {
      throw new NotFoundException(`Room with id ${roomId} was not found`);
    }

    if (room.ownerUid === decoded.uid) {
      return room;
    }

    return this.roomsDao.addParticipant(roomId, decoded.uid);
  }

  async removeMembership(decoded: DecodedIdToken, roomId: string): Promise<Room> {
    const room = await this.roomsDao.findById(roomId);

    if (!room) {
      throw new NotFoundException(`Room with id ${roomId} was not found`);
    }

    if (room.ownerUid === decoded.uid) {
      throw new ForbiddenException('Room owners cannot remove their own room membership');
    }

    return this.roomsDao.removeParticipant(roomId, decoded.uid);
  }

  async getRoomMembers(
    decoded: DecodedIdToken,
    roomId: string,
  ): Promise<RoomMemberProfile[]> {
    console.log('[RoomsService] getRoomMembers:start', {
      uid: decoded.uid,
      roomId,
    });
    const room = await this.roomsDao.findById(roomId);

    if (!room) {
      console.log('[RoomsService] getRoomMembers:not-found', { roomId });
      throw new NotFoundException(`Room with id ${roomId} was not found`);
    }

    const members = await this.roomsDao.findMembers(roomId);
    console.log('[RoomsService] getRoomMembers:members-docs', {
      roomId,
      count: members.length,
      uids: members.map((member) => member.uid),
    });
    const profiles = await Promise.all(
      members.map(async (member) => {
        const profile = await this.usersDao.findById(member.uid);
        const displayName = profile
          ? `${profile.firstName} ${profile.lastName}`.trim() ||
            profile.username ||
            profile.email
          : member.uid;

        return {
          ...member,
          displayName,
          email: profile?.email,
          username: profile?.username,
          avatarUrl: profile?.avatarUrl,
        };
      }),
    );

    const ownerProfile = await this.usersDao.findById(room.ownerUid);
    console.log('[RoomsService] getRoomMembers:owner-profile', {
      roomId,
      ownerUid: room.ownerUid,
      found: Boolean(ownerProfile),
    });
    const ownerDisplayName = ownerProfile
      ? `${ownerProfile.firstName} ${ownerProfile.lastName}`.trim() ||
        ownerProfile.username ||
        ownerProfile.email
      : room.ownerUid;

    const result = [
      {
        id: room.ownerUid,
        roomId,
        uid: room.ownerUid,
        joinedAt: room.createdAt,
        displayName: ownerDisplayName,
        email: ownerProfile?.email,
        username: ownerProfile?.username,
        avatarUrl: ownerProfile?.avatarUrl,
      },
      ...profiles.filter((member) => member.uid !== room.ownerUid),
    ];
    console.log('[RoomsService] getRoomMembers:success', {
      roomId,
      count: result.length,
    });
    return result;
  }

  async getMyRoomsMembers(
    decoded: DecodedIdToken,
  ): Promise<Record<string, RoomMemberProfile[]>> {
    console.log('[RoomsService] getMyRoomsMembers:start', {
      uid: decoded.uid,
    });
    const rooms = await this.getMyRooms(decoded);
    console.log('[RoomsService] getMyRoomsMembers:rooms', {
      uid: decoded.uid,
      roomIds: rooms.map((room) => room.id),
    });
    const entries = await Promise.all(
      rooms.map(async (room) => [
        room.id,
        await this.getRoomMembers(decoded, room.id),
      ] as const),
    );

    const result = Object.fromEntries(entries);
    console.log('[RoomsService] getMyRoomsMembers:success', {
      uid: decoded.uid,
      counts: Object.fromEntries(
        Object.entries(result).map(([roomId, members]) => [
          roomId,
          members.length,
        ]),
      ),
    });
    return result;
  }
}
