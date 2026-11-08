import type { UsuarioResponse } from '../usuarios/usuario.type.js';
export type AuthUser = UsuarioResponse & { auth_version: number };
export type SessionIdentity = { id: number; version: number };

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}
