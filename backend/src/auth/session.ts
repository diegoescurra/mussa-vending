import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { randomBytes } from 'node:crypto';
import pool from '../config/db.js';

const production = process.env.NODE_ENV === 'production';
const secret = process.env.SESSION_SECRET;
if (production && (!secret || secret.length < 32))
  throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
if (secret && secret.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
const sameSite = process.env.SESSION_SAME_SITE ?? 'lax';
if (sameSite !== 'lax' && sameSite !== 'strict' && sameSite !== 'none')
  throw new Error('SESSION_SAME_SITE invalido.');
if (sameSite === 'none' && !production)
  throw new Error('SameSite=None requiere HTTPS y NODE_ENV=production.');
export const cookieName = 'mussa.sid';
export const cookieOptions = { httpOnly: true, secure: production, sameSite, path: '/' } as const;
const PgStore = connectPgSimple(session);
export const sessionMiddleware = session({
  name: cookieName,
  // En desarrollo, reiniciar sin secreto configurado cierra las sesiones anteriores.
  secret: secret ?? randomBytes(32).toString('hex'),
  store: new PgStore({ pool, tableName: 'sesiones', createTableIfMissing: false }),
  resave: false,
  saveUninitialized: false,
  cookie: { ...cookieOptions, maxAge: 12 * 60 * 60 * 1000 },
});
