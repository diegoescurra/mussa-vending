import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './camioneta.route.js';

jest.mock('../config/db.js', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

const app = createTestApp(router);
const query = jest.fn();
const release = jest.fn();
const camioneta = { id_camioneta: 1, nombre: 'Camioneta 1', patente: 'ABCD12', id_repartidor: 2, estado: true };
const usuarios = [
  { id_usuario: 3, nombre: 'Ana', apellido: 'Perez', rol: 'ADMIN', estado: true },
  { id_usuario: 2, nombre: 'Juan', apellido: 'Lopez', rol: 'REPONEDOR', estado: true },
];
const payload = { id_bodeguero: 3, id_producto: 5, cantidad: 20 };
const movimiento = { id_movimiento: 7, id_camioneta: 1, id_producto: 5, id_bodeguero: 3, id_repartidor: 2, id_movimiento_bodega: 6, cantidad: 20, stock_final: 30 };

const mockDelivery = () => {
  query.mockImplementation(async (sql: string) => {
    if (sql.startsWith('SELECT * FROM camionetas')) return { rows: [camioneta] };
    if (sql.includes('FROM usuarios')) return { rows: usuarios };
    if (sql.includes('FROM productos')) return { rows: [{ id_producto: 5, estado: true }] };
    if (sql.startsWith('UPDATE bodega_productos')) return { rows: [{ stock_actual: 70 }] };
    if (sql.startsWith('UPDATE camioneta_productos')) return { rows: [{ stock_actual: 30 }] };
    if (sql.includes('INSERT INTO bodega_movimientos')) return { rows: [{ id_movimiento: 6 }] };
    if (sql.includes('INSERT INTO camioneta_movimientos')) return { rows: [movimiento] };
    return { rows: [] };
  });
};

describe('camioneta inventory and deliveries', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue({ query, release });
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
    mockDelivery();
  });

  it('returns inventory including products with zero stock', async () => {
    const inventario = [{ id_producto: 5, producto_nombre: 'Chocolate', estado: true, stock_actual: 0 }];
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [camioneta] }).mockResolvedValueOnce({ rows: inventario });
    const response = await request(app).get('/api/camionetas/1/inventario');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(inventario);
    expect((pool.query as jest.Mock).mock.calls[1][1]).toEqual([1]);
  });

  it('returns history using the recipient saved in each movement', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [camioneta] }).mockResolvedValueOnce({ rows: [movimiento] });
    const response = await request(app).get('/api/camionetas/1/movimientos');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([movimiento]);
    expect((pool.query as jest.Mock).mock.calls[1][0]).toContain('r.id_usuario = m.id_repartidor');
  });

  it.each(['inventario', 'movimientos'])('returns 404 for a missing truck on %s', async (path) => {
    const response = await request(app).get(`/api/camionetas/99/${path}`);
    expect(response.status).toBe(404);
  });

  it('subtracts central stock and adds to existing truck stock with linked history', async () => {
    const response = await request(app).post('/api/camionetas/1/cargas').send({ ...payload, id_repartidor: 999 });
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(movimiento);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE bodega_productos'), [20, 5]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE camioneta_productos'), [20, 1, 5]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO bodega_movimientos'), [5, 20, 70, expect.stringContaining('Juan Lopez')]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO camioneta_movimientos'), [1, 5, 3, 2, 6, 20, 30, null]);
    expect(query).toHaveBeenLastCalledWith('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('saves the delivery observation', async () => {
    await request(app).post('/api/camionetas/1/cargas').send({ ...payload, observacion: 'Ruta aprobada' });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO camioneta_movimientos'), [1, 5, 3, 2, 6, 20, 30, 'Ruta aprobada']);
  });

  it.each([
    {},
    { ...payload, id_bodeguero: 0 },
    { ...payload, id_producto: '5' },
    { ...payload, cantidad: 0 },
    { ...payload, cantidad: -1 },
    { ...payload, cantidad: 1.5 },
    { ...payload, cantidad: 2147483648 },
    { ...payload, observacion: 123 },
  ])('rejects malformed payloads before opening a transaction', async (body) => {
    const response = await request(app).post('/api/camionetas/1/cargas').send(body);
    expect(response.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it.each([
    ['missing truck', 'SELECT * FROM camionetas', [], 404],
    ['inactive truck', 'SELECT * FROM camionetas', [{ ...camioneta, estado: false }], 400],
    ['missing admin', 'SELECT id_usuario', [usuarios[1]], 400],
    ['inactive admin', 'SELECT id_usuario', [{ ...usuarios[0], estado: false }, usuarios[1]], 400],
    ['wrong admin role', 'SELECT id_usuario', [{ ...usuarios[0], rol: 'REPONEDOR' }, usuarios[1]], 400],
    ['missing recipient', 'SELECT id_usuario', [usuarios[0]], 400],
    ['inactive recipient', 'SELECT id_usuario', [usuarios[0], { ...usuarios[1], estado: false }], 400],
    ['wrong recipient role', 'SELECT id_usuario', [usuarios[0], { ...usuarios[1], rol: 'ADMIN' }], 400],
    ['missing product', 'SELECT id_producto', [], 404],
    ['inactive product', 'SELECT id_producto', [{ id_producto: 5, estado: false }], 400],
    ['insufficient central stock', 'UPDATE bodega_productos', [], 409],
    ['truck balance overflow', 'UPDATE camioneta_productos', [], 409],
  ])('rolls back for %s', async (_label, sqlPrefix, rows, status) => {
    const successImplementation = query.getMockImplementation()!;
    query.mockImplementation((sql: string, values: unknown) => sql.startsWith(sqlPrefix as string)
      ? Promise.resolve({ rows }) : successImplementation(sql, values));
    const response = await request(app).post('/api/camionetas/1/cargas').send(payload);
    expect(response.status).toBe(status);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back both stocks and the central history if saving truck history fails', async () => {
    const successImplementation = query.getMockImplementation()!;
    query.mockImplementation((sql: string, values: unknown) => sql.includes('INSERT INTO camioneta_movimientos')
      ? Promise.reject(new Error('History error')) : successImplementation(sql, values));
    const response = await request(app).post('/api/camionetas/1/cargas').send(payload);
    expect(response.status).toBe(500);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO bodega_movimientos'), expect.any(Array));
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('does not delete a truck with inventory or delivery records', async () => {
    (pool.query as jest.Mock).mockRejectedValue({ code: '23503' });
    const response = await request(app).delete('/api/camionetas/1');
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('desactivela');
  });

  it.each(['abc', '0', '-1', '1.5', '2147483648'])('rejects invalid truck ID %s', async (id) => {
    expect((await request(app).post(`/api/camionetas/${id}/cargas`).send(payload)).status).toBe(400);
    expect((await request(app).get(`/api/camionetas/${id}/inventario`)).status).toBe(400);
    expect((await request(app).get(`/api/camionetas/${id}/movimientos`)).status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });
});
