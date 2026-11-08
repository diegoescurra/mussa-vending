import bcrypt from 'bcrypt';
import { AppError } from '../utils/AppError.js';

export function validatePassword(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new AppError('La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.', 400);
  }
}
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
