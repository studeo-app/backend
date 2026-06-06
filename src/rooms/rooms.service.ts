import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { RoomsDao, CreateRoomData, Room } from '../daos/rooms.dao';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly roomsDao: RoomsDao) {}
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
    return this.roomsDao.findByOwner(decoded.uid);
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
}
