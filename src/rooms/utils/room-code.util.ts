import { randomInt } from 'crypto';

const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ROOM_CODE_LENGTH = 6;

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[randomInt(ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}
