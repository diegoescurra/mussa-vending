import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './bodega.route.js';

jest.mock('../config/db.js', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

const app = createTestApp(router);
const query = jest.fn();
const release = jest.fn();
const payload = { id_producto: 1, tipo: 'ENTRADA', cantidad: 90, observacion: 'Compra' };

describe('bodega', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue({ query, release });
    query.mockResolvedValue({ rows: [] });
  });

  it('returns inventory', async () => {
    const inventario = [{ id_producto: 1, producto_nombre: 'Snack', stock_actual: 0 }];
    (pool.query as jest.Mock).mockResolvedValue({ rows: inventario });
    const response = await request(app).get('/api/bodega');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: inventario });
  });

  it('caps history by default and resumes after the last returned movement', async () => {
    const movimientos = Array.from({ length: 52 }, (_, i) => ({ id_movimiento: 52 - i, ...payload }));
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rows: movimientos.slice(0, 51) })
      .mockResolvedValueOnce({ rows: movimientos.slice(50) });

    const first = await request(app).get('/api/bodega/movimientos');
    expect(first.status).toBe(200);
    expect(first.body.data).toEqual({ items: movimientos.slice(0, 50), nextCursor: 3 });
    expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining('LIMIT $2'), [2147483647, 51]);

    const second = await request(app).get(`/api/bodega/movimientos?antes_de=${first.body.data.nextCursor}`);
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual({ items: movimientos.slice(50), nextCursor: null });
    expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining('m.id_movimiento <= $1'), [2, 51]);
  });

  it('rejects an ambiguous history cursor before querying the database', async () => {
    const response = await request(app).get('/api/bodega/movimientos?antes_de=2&antes_de=3');
    expect(response.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it.each(['ENTRADA', 'SALIDA'])('commits a %s with its updated balance', async (tipo) => {
    const movimiento = { id_movimiento: 1, ...payload, tipo, stock_final: 100 };
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id_producto: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ stock_actual: 100 }] })
      .mockResolvedValueOnce({ rows: [movimiento] });

    const response = await request(app).post('/api/bodega/movimientos').send({ ...payload, tipo });
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(movimiento);
    expect(query.mock.calls[3][1]).toEqual([tipo === 'ENTRADA' ? 90 : -90, 1]);
    expect(query.mock.calls[4][1]).toEqual([1, tipo, 90, 100, 'Compra']);
    expect(query).toHaveBeenLastCalledWith('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it.each([
    {},
    { ...payload, id_producto: 0 },
    { ...payload, tipo: 'AJUSTE' },
    { ...payload, cantidad: 0 },
    { ...payload, cantidad: -1 },
    { ...payload, cantidad: 1.5 },
    { ...payload, cantidad: '90' },
    { ...payload, cantidad: 2147483648 },
    { ...payload, observacion: 123 },
  ])('rejects an invalid payload before connecting', async (body) => {
    const response = await request(app).post('/api/bodega/movimientos').send(body);
    expect(response.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('rolls back for a missing product', async () => {
    const response = await request(app).post('/api/bodega/movimientos').send(payload);
    expect(response.status).toBe(404);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back an insufficient balance', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id_producto: 1 }] });
    const response = await request(app).post('/api/bodega/movimientos').send({ ...payload, tipo: 'SALIDA' });
    expect(response.status).toBe(409);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO bodega_movimientos'))).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('rolls back the balance when saving the movement fails', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id_producto: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ stock_actual: 90 }] })
      .mockRejectedValueOnce(new Error('Database error'));
    const response = await request(app).post('/api/bodega/movimientos').send(payload);
    expect(response.status).toBe(500);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
