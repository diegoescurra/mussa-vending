import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './proveedor.route.js';

jest.mock('../config/db.js', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

const app = createTestApp(router);
const query = pool.query as jest.Mock;
const proveedor = { id_proveedor: 1, nombre: 'Proveedor', estado: true };

describe('proveedores routes with real service and mock database', () => {
  beforeEach(() => jest.resetAllMocks());

  it('lists proveedores through the real service', async () => {
    query.mockResolvedValueOnce({ rows: [proveedor] });
    const response = await request(app).get('/api/proveedores');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([proveedor]);
    expect(query).toHaveBeenCalledWith('SELECT * FROM proveedores');
  });

  it.each(['1', '2147483647'])('accepts positive int32 ID %s', async (id) => {
    query.mockResolvedValueOnce({ rows: [proveedor] });
    const response = await request(app).get(`/api/proveedores/${id}`);
    expect(response.status).toBe(200);
    expect(query).toHaveBeenCalledWith('SELECT * FROM proveedores WHERE id_proveedor = $1', [Number(id)]);
  });

  it.each(['0', '-1', '1.5', 'abc', '2147483648', '1e2', 'Infinity', '%20', '1%20'])('rejects invalid ID %s before accessing DB', async (id) => {
    for (const method of ['get', 'put', 'delete'] as const) {
      const response = await request(app)[method](`/api/proveedores/${id}`).send({ nombre: 'Proveedor', estado: true });
      expect(response.status).toBe(400);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', '   ', '\t\n', 123, true, {}, []])('rejects invalid nombre %p on POST and PUT', async (nombre) => {
    for (const method of ['post', 'put'] as const) {
      const response = await request(app)[method](`/api/proveedores${method === 'put' ? '/1' : ''}`).send({ nombre, estado: true });
      expect(response.status).toBe(400);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 'false', 0, 1, {}, []])('rejects invalid or missing estado %p on PUT', async (estado) => {
    const response = await request(app).put('/api/proveedores/1').send({ nombre: 'Proveedor', estado });
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('requires nombre even if estado is supplied in PUT', async () => {
    const response = await request(app).put('/api/proveedores/1').send({ estado: false });
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('creates with trimmed nombre and retains internal spaces', async () => {
    query.mockResolvedValueOnce({ rows: [proveedor] });
    const response = await request(app).post('/api/proveedores').send({ nombre: '  Proveedor del sur \n' });
    expect(response.status).toBe(201);
    expect(query).toHaveBeenCalledWith('INSERT INTO proveedores (nombre) VALUES ($1) RETURNING *', ['Proveedor del sur']);
  });

  it.each([false, true])('updates complete DTO with boolean estado %p', async (estado) => {
    query.mockResolvedValueOnce({ rows: [proveedor] }).mockResolvedValueOnce({ rows: [{ ...proveedor, estado }] });
    const response = await request(app).put('/api/proveedores/1').send({ nombre: ' Proveedor ', estado });
    expect(response.status).toBe(200);
    expect(response.body.data.estado).toBe(estado);
    expect(query).toHaveBeenLastCalledWith('UPDATE proveedores SET nombre = $1, estado = $2 WHERE id_proveedor = $3 RETURNING *', ['Proveedor', estado, 1]);
  });

  it.each(['get', 'put', 'delete'] as const)('returns 404 on %s for a missing proveedor', async (method) => {
    query.mockResolvedValueOnce({ rows: [] });
    const response = await request(app)[method]('/api/proveedores/1').send({ nombre: 'Proveedor', estado: false });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Proveedor no encontrado');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns 404 if proveedor disappears during update', async () => {
    query.mockResolvedValueOnce({ rows: [proveedor] }).mockResolvedValueOnce({ rows: [] });
    const response = await request(app).put('/api/proveedores/1').send({ nombre: 'Proveedor', estado: true });
    expect(response.status).toBe(404);
  });

  it.each(['post', 'put'] as const)('maps unique 23505 to conflict on %s', async (method) => {
    if (method === 'put') query.mockResolvedValueOnce({ rows: [proveedor] });
    query.mockRejectedValueOnce(Object.assign(new Error('internal constraint details'), { code: '23505' }));
    const response = await request(app)[method](`/api/proveedores${method === 'put' ? '/1' : ''}`).send({ nombre: 'Proveedor', estado: true });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ status: 'fail', message: 'Ya existe un proveedor con ese nombre' });
  });

  it('preserves DELETE without deleting or updating products, leaving unlinking to the existing FK', async () => {
    query.mockResolvedValueOnce({ rows: [proveedor] }).mockResolvedValueOnce({ rowCount: 1 });
    const response = await request(app).delete('/api/proveedores/1');
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenLastCalledWith('DELETE FROM proveedores WHERE id_proveedor = $1', [1]);
  });

  it.each(['get', 'post', 'put', 'delete'] as const)('keeps unexpected DB errors as 500 on %s', async (method) => {
    if (method === 'put' || method === 'delete') query.mockResolvedValueOnce({ rows: [proveedor] });
    query.mockRejectedValueOnce(Object.assign(new Error('private DB details'), { code: '08006' }));
    const response = await request(app)[method](`/api/proveedores${method === 'post' ? '' : '/1'}`).send({ nombre: 'Proveedor', estado: true });
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ status: 'error', message: 'Error interno del servidor' });
  });
});
