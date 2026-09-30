import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './conteo.route.js';
import { createConteo, getConteos } from './conteo.service.js';

jest.mock('../config/db.js', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

const app = createTestApp(router);
const query = jest.fn();
const release = jest.fn();
const payload = { id_responsable: 3, id_producto: 5, stock_fisico: 0 };
const admin = { id_usuario: 3, rol: 'ADMIN', estado: true };
const camioneta = { id_camioneta: 1, id_repartidor: 2, estado: false };

describe('physical counts service and routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue({ query, release });
    (pool.query as jest.Mock).mockResolvedValue({ rows: [] });
    query.mockImplementation(async (sql: string, values: unknown[]) => {
      if (sql.includes('FROM camionetas')) return { rows: [camioneta] };
      if (sql.includes('FROM usuarios')) return { rows: [admin] };
      if (sql.includes('FROM productos')) return { rows: [{ id_producto: 5, estado: false }] };
      if (sql.startsWith('SELECT stock_actual')) return { rows: [{ stock_actual: 10 }] };
      if (sql.includes('INSERT INTO conteos')) {
        const [id_camioneta, id_producto, id_responsable, stock_esperado, stock_fisico, observacion] = values;
        return { rows: [{ id_conteo: 7, id_camioneta, id_producto, id_responsable, stock_esperado,
          stock_fisico, diferencia: Number(stock_fisico) - Number(stock_esperado), observacion, fecha_creacion: '2026-09-30T12:00:00Z' }] };
      }
      return { rows: [] };
    });
  });

  it.each([[0, -10], [7, -3], [10, 0], [13, 3], [2147483647, 2147483637]])(
    'captures physical %s and difference %s without changing stocks or movements', async (stock_fisico, diferencia) => {
      const response = await request(app).post('/api/conteos').send({ ...payload, stock_fisico, stock_esperado: 999, diferencia: 999 });
      expect(response.status).toBe(201);
      expect(response.body.data).toEqual({ id_conteo: 7, id_camioneta: null, id_producto: 5, id_responsable: 3,
        stock_esperado: 10, stock_fisico, diferencia, observacion: null, fecha_creacion: '2026-09-30T12:00:00Z' });
      expect(query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (id_producto) DO NOTHING'), [5]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM bodega_productos WHERE id_producto = $1 FOR UPDATE'), [5]);
      expect(query.mock.calls.some(([sql]) => /\bUPDATE\s+\w+|\b(?:INSERT INTO|DELETE FROM)\s+\w*movimientos/i.test(sql))).toBe(false);
      expect(query).toHaveBeenLastCalledWith('COMMIT');
      expect(release).toHaveBeenCalledTimes(1);
    },
  );

  it('initializes a missing balance at zero and records a zero count', async () => {
    const success = query.getMockImplementation()!;
    query.mockImplementation((sql: string, values: unknown[]) => sql.startsWith('SELECT stock_actual')
      ? Promise.resolve({ rows: [{ stock_actual: 0 }] }) : success(sql, values));
    const result = await createConteo(payload);
    expect(result.stock_esperado).toBe(0);
    expect(result.diferencia).toBe(0);
    const insert = query.mock.calls.findIndex(([sql]) => sql.includes('INSERT INTO bodega_productos'));
    const lock = query.mock.calls.findIndex(([sql]) => sql.startsWith('SELECT stock_actual'));
    expect(insert).toBeLessThan(lock);
  });

  it.each([admin, { id_usuario: 2, rol: 'REPONEDOR', estado: true }])(
    'allows an active admin or assigned reponedor for an inactive truck and product', async (responsable) => {
      const success = query.getMockImplementation()!;
      query.mockImplementation((sql: string, values: unknown[]) => sql.includes('FROM usuarios')
        ? Promise.resolve({ rows: [responsable] }) : success(sql, values));
      const response = await request(app).post('/api/conteos').send({ ...payload, id_responsable: responsable.id_usuario,
        id_camioneta: 1, observacion: 'Auditoria' });
      expect(response.status).toBe(201);
      expect(response.body.data.id_camioneta).toBe(1);
      expect(response.body.data.observacion).toBe('Auditoria');
      expect(query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT (id_camioneta, id_producto) DO NOTHING'), [1, 5]);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM camioneta_productos WHERE id_camioneta = $1 AND id_producto = $2 FOR UPDATE'), [1, 5]);
      const locks = query.mock.calls.filter(([sql]) => sql.includes('FOR SHARE')).map(([sql]) => sql);
      expect(locks[0]).toContain('FROM camionetas');
      expect(locks[1]).toContain('FROM usuarios');
      expect(locks[2]).toContain('FROM productos');
      expect(query.mock.calls.some(([sql]) => /\bUPDATE\s+\w+|\b(?:INSERT INTO|DELETE FROM)\s+\w*movimientos/i.test(sql))).toBe(false);
    },
  );

  it.each([
    {}, { ...payload, id_responsable: 0 }, { ...payload, id_responsable: 2147483648 },
    { ...payload, id_producto: '5' }, { ...payload, id_producto: -1 }, { ...payload, id_producto: 1.5 },
    { ...payload, id_producto: 2147483648 }, { ...payload, id_camioneta: null },
    { ...payload, id_camioneta: 0 }, { ...payload, id_camioneta: '1' }, { ...payload, id_camioneta: 1.5 },
    { ...payload, id_camioneta: 2147483648 }, { ...payload, stock_fisico: -1 },
    { ...payload, stock_fisico: 1.5 }, { ...payload, stock_fisico: '0' },
    { ...payload, stock_fisico: null }, { ...payload, stock_fisico: 2147483648 }, { ...payload, observacion: 123 },
  ])('rejects invalid bodies before connecting', async (body) => {
    expect((await request(app).post('/api/conteos').send(body)).status).toBe(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it.each([
    ['missing truck', 'FROM camionetas', [], 404, 1],
    ['missing user', 'FROM usuarios', [], 400, undefined],
    ['inactive admin', 'FROM usuarios', [{ ...admin, estado: false }], 400, undefined],
    ['central reponedor', 'FROM usuarios', [{ id_usuario: 2, rol: 'REPONEDOR', estado: true }], 400, undefined],
    ['unassigned reponedor', 'FROM usuarios', [{ id_usuario: 3, rol: 'REPONEDOR', estado: true }], 400, 1],
    ['inactive assigned reponedor', 'FROM usuarios', [{ id_usuario: 2, rol: 'REPONEDOR', estado: false }], 400, 1],
    ['wrong role', 'FROM usuarios', [{ ...admin, rol: 'OTRO' }], 400, 1],
    ['missing product', 'FROM productos', [], 404, undefined],
  ])('rolls back for %s', async (_label, fragment, rows, status, id_camioneta) => {
    const success = query.getMockImplementation()!;
    query.mockImplementation((sql: string, values: unknown[]) => sql.includes(fragment as string)
      ? Promise.resolve({ rows }) : success(sql, values));
    const response = await request(app).post('/api/conteos').send({ ...payload, id_camioneta });
    expect(response.status).toBe(status);
    expect(query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(query).not.toHaveBeenCalledWith('COMMIT');
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO conteos'), expect.anything());
    expect(release).toHaveBeenCalledTimes(1);
  });

  it.each(['INSERT INTO bodega_productos', 'SELECT stock_actual', 'INSERT INTO conteos', 'COMMIT'])(
    'rolls back and releases the connection if %s fails', async (fragment) => {
      const success = query.getMockImplementation()!;
      query.mockImplementation((sql: string, values: unknown[]) => sql.includes(fragment)
        ? Promise.reject(new Error('Database error')) : success(sql, values));
      expect((await request(app).post('/api/conteos').send(payload)).status).toBe(500);
      expect(query).toHaveBeenLastCalledWith('ROLLBACK');
      expect(release).toHaveBeenCalledTimes(1);
    },
  );

  it('surfaces connection errors', async () => {
    (pool.connect as jest.Mock).mockRejectedValue(new Error('Unavailable'));
    await expect(createConteo(payload)).rejects.toThrow('Unavailable');
    expect(query).not.toHaveBeenCalled();
  });

  it('returns only central history with product and concatenated responsible names', async () => {
    const history = [{ id_conteo: 7, producto_nombre: 'Chocolate', responsable_nombre: 'Ana Perez' }];
    (pool.query as jest.Mock).mockResolvedValue({ rows: history });
    const response = await request(app).get('/api/conteos');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(history);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('c.id_camioneta IS NULL'), []);
    expect((pool.query as jest.Mock).mock.calls[0][0]).toContain("concat_ws(' ', u.nombre, u.apellido)");
  });

  it('filters truck history and allows inactive trucks', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [camioneta] }).mockResolvedValueOnce({ rows: [] });
    expect((await request(app).get('/api/conteos?id_camioneta=1')).status).toBe(200);
    expect(pool.query).toHaveBeenLastCalledWith(expect.stringContaining('c.id_camioneta = $1'), [1]);
  });

  it('returns 404 for missing truck history', async () => {
    expect((await request(app).get('/api/conteos?id_camioneta=1')).status).toBe(404);
  });

  it.each(['', 'abc', '0', '-1', '1.5', '2147483648', '1&id_camioneta=2', '1e2', '0x10', '1%20'])(
    'rejects invalid query ID %s', async (id) => {
      expect((await request(app).get(`/api/conteos?id_camioneta=${id}`)).status).toBe(400);
      expect(pool.query).not.toHaveBeenCalled();
    },
  );

  it('validates direct service filters and surfaces history errors', async () => {
    await expect(getConteos(0)).rejects.toMatchObject({ statusCode: 400 });
    (pool.query as jest.Mock).mockRejectedValue(new Error('History error'));
    expect((await request(app).get('/api/conteos')).status).toBe(500);
  });
});
