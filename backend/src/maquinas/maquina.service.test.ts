import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './route.maquina.js';

jest.mock('../config/db.js', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

const app = createTestApp(router);
const query = pool.query as jest.Mock;
const payload = { codigo: 'M-001', nombre: 'Maquina 1', descripcion: 'Desc', ubicacion: 'Local', estado: 'ACTIVA', modelo: 'Modelo 1', sistemas_pago: ['BILLETE', 'MONEDA'] };
const maquina = { id_maquina: 1, ...payload };

describe('maquinas routes with real service and mock database', () => {
  beforeEach(() => jest.resetAllMocks());

  it('persists trimmed modelo and payment array using INSERT parameters', async () => {
    query.mockResolvedValueOnce({ rows: [maquina] });
    const response = await request(app).post('/api/maquinas').send({ ...payload, modelo: ' Modelo 1 ' });
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(maquina);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      'INSERT INTO maquinas (codigo, nombre, descripcion, ubicacion, estado, modelo, sistemas_pago) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      ['M-001', 'Maquina 1', 'Desc', 'Local', 'ACTIVA', 'Modelo 1', ['BILLETE', 'MONEDA']],
    );
  });

  it('configures a legacy row with complete PUT without inventory or history queries', async () => {
    query.mockResolvedValueOnce({ rows: [{ ...maquina, modelo: '', sistemas_pago: [] }] })
      .mockResolvedValueOnce({ rows: [maquina] });
    const response = await request(app).put('/api/maquinas/1').send({ ...payload, modelo: '\tModelo 1\n' });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(maquina);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(1, 'SELECT * FROM maquinas WHERE id_maquina = $1', [1]);
    expect(query).toHaveBeenLastCalledWith(
      'UPDATE maquinas SET codigo = $1, nombre = $2, descripcion = $3, ubicacion = $4, estado = $5, modelo = $6, sistemas_pago = $7 WHERE id_maquina = $8 RETURNING *',
      ['M-001', 'Maquina 1', 'Desc', 'Local', 'ACTIVA', 'Modelo 1', ['BILLETE', 'MONEDA'], 1],
    );
  });

  it('keeps 404 for complete PUT when the machine does not exist', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const response = await request(app).put('/api/maquinas/999').send(payload);
    expect(response.status).toBe(404);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each(['post', 'put'] as const)('rejects legacy empty configuration on %s before accessing DB', async (method) => {
    for (const invalid of [{ modelo: '' }, { sistemas_pago: [] }]) {
      const response = await request(app)[method](`/api/maquinas${method === 'put' ? '/1' : ''}`).send({ ...payload, ...invalid });
      expect(response.status).toBe(400);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it.each(['get', 'getById'] as const)('returns legacy defaults without writing on %s', async (method) => {
    const legacy = { ...maquina, modelo: '', sistemas_pago: [] };
    query.mockResolvedValueOnce({ rows: [legacy] });
    const response = await request(app).get(`/api/maquinas${method === 'getById' ? '/1' : ''}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(method === 'getById' ? legacy : [legacy]);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      method === 'getById' ? 'SELECT * FROM maquinas WHERE id_maquina = $1' : 'SELECT * FROM maquinas',
      ...(method === 'getById' ? [[1]] : []),
    );
  });
});
