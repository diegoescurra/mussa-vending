import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './camioneta.route.js';

jest.mock('../config/db.js', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

const app = createTestApp(router);
const query = pool.query as jest.Mock;
const payload = { patente: 'abcd12', nombre: 'Camioneta 1', id_repartidor: 2, estado: true };
const camioneta = { id_camioneta: 1, ...payload, patente: 'ABCD12', repartidor_nombre: 'Juan', repartidor_apellido: 'Perez' };

describe('camionetas CRUD', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({ rows: [] });
  });

  it('lists camionetas with their repartidor', async () => {
    query.mockResolvedValue({ rows: [camioneta] });
    const response = await request(app).get('/api/camionetas');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([camioneta]);
    expect(query.mock.calls[0][0]).toContain('JOIN usuarios');
  });

  it('gets a camioneta', async () => {
    query.mockResolvedValue({ rows: [camioneta] });
    const response = await request(app).get('/api/camionetas/1');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(camioneta);
    expect(query.mock.calls[0][1]).toEqual([1]);
  });

  it('returns 404 for a missing camioneta', async () => {
    const response = await request(app).get('/api/camionetas/99');
    expect(response.status).toBe(404);
  });

  it('creates and normalizes a camioneta', async () => {
    query.mockResolvedValue({ rows: [camioneta] });
    const response = await request(app).post('/api/camionetas').send({ ...payload, patente: ' abcd12 ', nombre: ' Camioneta 1 ' });
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(camioneta);
    expect(query.mock.calls[0][1]).toEqual(['ABCD12', 'Camioneta 1', 2, true]);
    expect(query.mock.calls[0][0]).toContain("u.rol = 'REPONEDOR' AND u.estado = true");
  });

  it.each([
    {},
    { ...payload, patente: ' ' },
    { ...payload, nombre: ' ' },
    { ...payload, id_repartidor: 0 },
    { ...payload, id_repartidor: 1.5 },
    { ...payload, id_repartidor: '2' },
    { ...payload, id_repartidor: 2147483648 },
    { ...payload, estado: 'true' },
  ])('rejects invalid create and update payloads', async (body) => {
    const create = await request(app).post('/api/camionetas').send(body);
    const update = await request(app).put('/api/camionetas/1').send(body);
    expect(create.status).toBe(400);
    expect(update.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a nonexistent, inactive or non-reponedor assignment', async () => {
    const response = await request(app).post('/api/camionetas').send(payload);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('REPONEDOR');
  });

  it.each(['camionetas_patente_key', 'camionetas_id_repartidor_key'])('reports a duplicate %s', async (constraint) => {
    query.mockRejectedValue({ code: '23505', constraint });
    const response = await request(app).post('/api/camionetas').send(payload);
    expect(response.status).toBe(409);
  });

  it('updates all fields including estado false', async () => {
    query.mockResolvedValueOnce({ rows: [camioneta] }).mockResolvedValueOnce({ rows: [{ ...camioneta, estado: false }] });
    const response = await request(app).put('/api/camionetas/1').send({ ...payload, estado: false });
    expect(response.status).toBe(200);
    expect(response.body.data.estado).toBe(false);
    expect(query.mock.calls[1][1]).toEqual(['ABCD12', 'Camioneta 1', 2, false, 1]);
    expect(query.mock.calls[1][0]).toContain("u.rol = 'REPONEDOR' AND u.estado = true");
  });

  it('rejects an unavailable assignment on update', async () => {
    query.mockResolvedValueOnce({ rows: [camioneta] });
    const response = await request(app).put('/api/camionetas/1').send(payload);
    expect(response.status).toBe(400);
  });

  it('reports a duplicate repartidor on update', async () => {
    query.mockResolvedValueOnce({ rows: [camioneta] }).mockRejectedValueOnce({ code: '23505' });
    const response = await request(app).put('/api/camionetas/1').send(payload);
    expect(response.status).toBe(409);
  });

  it('returns 404 when updating a missing camioneta', async () => {
    const response = await request(app).put('/api/camionetas/99').send(payload);
    expect(response.status).toBe(404);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('deletes a camioneta', async () => {
    query.mockResolvedValue({ rows: [{ id_camioneta: 1 }] });
    const response = await request(app).delete('/api/camionetas/1');
    expect(response.status).toBe(204);
    expect(query.mock.calls[0][1]).toEqual([1]);
  });

  it('returns 404 when deleting a missing camioneta', async () => {
    const response = await request(app).delete('/api/camionetas/99');
    expect(response.status).toBe(404);
  });

  it.each(['abc', '0', '-1', '1.5', '2147483648'])('rejects invalid route ID %s', async (id) => {
    expect((await request(app).get(`/api/camionetas/${id}`)).status).toBe(400);
    expect((await request(app).put(`/api/camionetas/${id}`).send(payload)).status).toBe(400);
    expect((await request(app).delete(`/api/camionetas/${id}`)).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('hides unexpected database errors', async () => {
    query.mockRejectedValue(new Error('Database failure'));
    const response = await request(app).post('/api/camionetas').send(payload);
    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Error interno del servidor');
  });
});
