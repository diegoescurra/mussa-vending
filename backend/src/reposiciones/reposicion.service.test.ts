import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './reposicion.route.js';

jest.mock('../config/db.js', () => ({
  __esModule: true,
  default: { connect: jest.fn() },
}));

const app = createTestApp(router);
const query = jest.fn();
const release = jest.fn();
const detalle = {
  id_maquina_producto: 3,
  stock_sistema: 10,
  stock_encontrado: 6,
  cantidad_vendida: 999,
  cantidad_repuesta: 4,
  cantidad_retirada: 2,
  stock_final: 999,
  precio_venta_actual: 1000,
  venta_esperada: 999,
};
const payload = {
  id_maquina: 1,
  id_repartidor: 2,
  dinero_retirado: 4000,
  venta_esperada: 999,
  diferencia_dinero: 999,
  detalles: [detalle],
};
const machineProduct = { id_maquina_producto: 3, id_producto: 5, stock_actual: 10, capacidad_maxima: 20, precio_venta_actual: '1000.00', estado: true };

const mockSuccess = () => {
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM camionetas')) return { rows: [{ id_camioneta: 7, estado: true }] };
    if (sql.includes('FROM usuarios')) return { rows: [{ rol: 'REPONEDOR', estado: true }] };
    if (sql.includes('FROM maquinas')) return { rows: [{ estado: 'ACTIVA' }] };
    if (sql.includes('FROM maquina_productos')) return { rows: [machineProduct] };
    if (sql.includes('UPDATE camioneta_productos')) return { rows: [{ stock_actual: 26 }] };
    if (sql.includes('INSERT INTO reposiciones')) return { rows: [{ id_reposicion: 9, id_camioneta: 7, id_repartidor: 2 }] };
    return { rows: [] };
  });
};

describe('reposicion from assigned truck', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue({ query, release });
    mockSuccess();
  });

  it('uses the assigned truck, recalculates sales and updates both stocks atomically', async () => {
    const response = await request(app).post('/api/reposiciones').send({ ...payload, id_camioneta: 999 });
    expect(response.status).toBe(201);
    expect(response.body.data.id_camioneta).toBe(7);
    expect(response.body.data.detalles[0]).toMatchObject({ cantidad_vendida: 4, stock_final: 8, venta_esperada: 4000 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM camionetas'), [2]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE camioneta_productos'), [4, 7, 5]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO reposiciones'), [1, 4000, null, 4000, 0, 7, 2]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE maquina_productos'), [8, 3]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO camioneta_movimientos'), [7, 5, 2, 4, 26, 9, 1, null]);
    expect(query).toHaveBeenLastCalledWith('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('aggregates replenishment of the same product across machine slots', async () => {
    const response = await request(app).post('/api/reposiciones').send({ ...payload, detalles: [detalle, { ...detalle, id_maquina_producto: 4 }] });
    expect(response.status).toBe(201);
    expect(query.mock.calls.filter(([sql]) => sql.includes('UPDATE camioneta_productos'))).toHaveLength(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE camioneta_productos'), [8, 7, 5]);
    expect(query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO camioneta_movimientos'))).toHaveLength(1);
  });

  it('records a zero-replenishment visit without requiring truck stock or creating a zero movement', async () => {
    const response = await request(app).post('/api/reposiciones').send({ ...payload, detalles: [{ ...detalle, cantidad_repuesta: 0 }] });
    expect(response.status).toBe(201);
    expect(query.mock.calls.some(([sql]) => sql.includes('UPDATE camioneta_productos'))).toBe(false);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO camioneta_movimientos'))).toBe(false);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE maquina_productos'), [4, 3]);
  });

  it.each([
    { ...payload, id_repartidor: undefined },
    { ...payload, id_repartidor: 0 },
    { ...payload, id_repartidor: '2' },
    { ...payload, dinero_retirado: -1 },
    { ...payload, observacion: 3 },
    { ...payload, detalles: [] },
    { ...payload, detalles: [null] },
    { ...payload, detalles: [detalle, detalle] },
    { ...payload, detalles: [{ ...detalle, cantidad_repuesta: 1.5 }] },
    { ...payload, detalles: [{ ...detalle, cantidad_repuesta: -1 }] },
    { ...payload, detalles: [{ ...detalle, stock_encontrado: 2147483648 }] },
  ])('rejects invalid payloads before connecting', async (body) => {
    const response = await request(app).post('/api/reposiciones').send(body);
    expect(response.status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it.each([
    ['no truck', 'FROM camionetas', [], 400],
    ['inactive truck', 'FROM camionetas', [{ id_camioneta: 7, estado: false }], 400],
    ['no user', 'FROM usuarios', [], 400],
    ['inactive user', 'FROM usuarios', [{ rol: 'REPONEDOR', estado: false }], 400],
    ['wrong role', 'FROM usuarios', [{ rol: 'ADMIN', estado: true }], 400],
    ['missing machine', 'FROM maquinas', [], 404],
    ['inactive machine', 'FROM maquinas', [{ estado: 'INACTIVA' }], 400],
    ['wrong machine product', 'FROM maquina_productos', [], 400],
    ['inactive machine product', 'FROM maquina_productos', [{ ...machineProduct, estado: false }], 400],
    ['stale stock', 'FROM maquina_productos', [{ ...machineProduct, stock_actual: 9 }], 409],
    ['stale price', 'FROM maquina_productos', [{ ...machineProduct, precio_venta_actual: '1200' }], 409],
    ['no truck stock', 'UPDATE camioneta_productos', [], 409],
  ])('rolls back for %s', async (_label, fragment, rows, status) => {
    const success = query.getMockImplementation()!;
    query.mockImplementation((sql: string, values: unknown) => sql.includes(fragment as string) ? Promise.resolve({ rows }) : success(sql, values));
    const response = await request(app).post('/api/reposiciones').send(payload);
    expect(response.status).toBe(status);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...detalle, stock_encontrado: 21 },
    { ...detalle, cantidad_retirada: 7 },
    { ...detalle, cantidad_repuesta: 30 },
  ])('rejects invalid machine quantities transactionally', async (line) => {
    const response = await request(app).post('/api/reposiciones').send({ ...payload, detalles: [line] });
    expect(response.status).toBe(400);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it.each(['INSERT INTO reposicion_detalles', 'UPDATE maquina_productos', 'INSERT INTO camioneta_movimientos'])('rolls back truck deductions when %s fails', async (fragment) => {
    const success = query.getMockImplementation()!;
    query.mockImplementation((sql: string, values: unknown) => sql.includes(fragment) ? Promise.reject(new Error('Database error')) : success(sql, values));
    const response = await request(app).post('/api/reposiciones').send(payload);
    expect(response.status).toBe(500);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE camioneta_productos'), [4, 7, 5]);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
