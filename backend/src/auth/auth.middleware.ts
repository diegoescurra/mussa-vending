import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { findById as findTruck } from '../camionetas/camioneta.repository.js';

export function csrfToken(req: Request) {
  return (req.session.csrfToken ??= randomBytes(32).toString('hex'));
}
export const requireCsrf: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const provided = req.get('X-CSRF-Token');
  const expected = req.session.csrfToken;
  if (
    !provided ||
    !expected ||
    !/^[a-f0-9]{64}$/.test(provided) ||
    provided.length !== expected.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  ) {
    throw new AppError('La sesión del formulario expiró. Recarga la página e inténtalo nuevamente.', 403);
  }
  next();
};
export const requireUser: RequestHandler = (req, _res, next) => {
  if (!req.user) throw new AppError('Debes iniciar sesión.', 401);
  next();
};
// Permisos cerrados por defecto para cada rol operativo.
export const authorizeApi: RequestHandler = async (req, _res, next) => {
  if (!req.user) throw new AppError('Debes iniciar sesión.', 401);
  const path = req.path.toLowerCase().replace(/\/+$/, '');
  if (req.method === 'POST' && path === '/reposiciones') {
    if (req.user.rol !== 'REPONEDOR')
      throw new AppError('Solo un reponedor puede registrar su reposición.', 403);
    return next();
  }
  if (req.user.rol === 'ADMIN') return next();
  if (req.user.rol === 'BODEGUERO') {
    const read = req.method === 'GET' && (
      ['/bodega', '/bodega/movimientos', '/conteos', '/productos/opciones', '/usuarios/reponedores'].includes(path)
      || /^\/camionetas\/\d+\/(inventario|movimientos)$/.test(path)
    );
    const write = req.method === 'POST' && (
      path === '/bodega/movimientos'
      || /^\/camionetas\/\d+\/cargas$/.test(path)
      || path === '/conteos'
    );
    const operation = ['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)
      && /^\/(maquinas|maquina-productos|camionetas)(\/\d+)?$/.test(path);
    if (read || write || operation) return next();
    throw new AppError('No tienes permiso para realizar esta acción.', 403);
  }
  if (req.user.rol !== 'REPONEDOR')
    throw new AppError('No tienes permiso para realizar esta acción.', 403);
  if (req.method === 'GET' && ['/maquinas', '/maquina-productos', '/camionetas'].includes(path))
    return next();
  const match = /^\/camionetas\/(\d+)\/inventario$/.exec(path);
  if (req.method === 'GET' && match) {
    const id = Number(match[1]);
    if (!Number.isInteger(id) || id < 1 || id > 2147483647)
      throw new AppError('Identificador de camioneta inválido.', 400);
    const [truck] = await findTruck(id);
    if (truck?.estado && truck.id_repartidor === req.user.id_usuario) return next();
  }
  throw new AppError('No tienes permiso para realizar esta acción.', 403);
};
