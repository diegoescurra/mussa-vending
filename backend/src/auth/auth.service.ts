import { randomBytes } from 'node:crypto';
import * as repository from './auth.repository.js';
import { hashPassword, verifyPassword } from './password.js';
import { AppError } from '../utils/AppError.js';
import type { AuthUser } from './auth.types.js';

// Un hash del mismo costo evita omitir bcrypt cuando no existe el correo.
let dummyHash: Promise<string> | undefined;
export async function authenticate(email: string, password: string): Promise<AuthUser | false> {
  const user = await repository.findCredentials(email);
  const validHash = user && /^\$2[ab]\$\d{2}\$/.test(user.password_hash);
  const hash = validHash
    ? user.password_hash
    : await (dummyHash ??= hashPassword(randomBytes(32).toString('hex')));
  const matches = await verifyPassword(password, hash);
  if (!user || !validHash || !user.estado || !matches) return false;
  const { password_hash: _hash, ...identity } = user;
  return identity;
}
export function publicUser(user: AuthUser) {
  const { auth_version: _version, ...publicFields } = user;
  return publicFields;
}
export async function changePassword(user: AuthUser, current: string, next: string) {
  const credentials = await repository.findCredentials(user.email.trim().toLowerCase());
  if (!credentials || !(await verifyPassword(current, credentials.password_hash))) {
    throw new AppError('La contraseña actual no es correcta.', 400);
  }
  if (!(await repository.replacePassword(user.id_usuario, user.auth_version, await hashPassword(next)))) {
    throw new AppError('La cuenta cambió. Inicia sesión nuevamente.', 401);
  }
}
