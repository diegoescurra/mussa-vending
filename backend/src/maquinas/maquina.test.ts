import request from 'supertest';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './route.maquina.js';
import * as service from './service.maquina.js';

jest.mock('./service.maquina.js');

const app = createTestApp(router);
const mockedService = jest.mocked(service);
const payload = { codigo: 'M-001', nombre: 'Maquina 1', descripcion: 'Desc', ubicacion: 'Local', estado: 'ACTIVA', modelo: 'Modelo 1', sistemas_pago: ['MONEDA', 'TARJETA'] };

describe('maquinas routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/maquinas returns maquinas', async () => {
    mockedService.getAllMaquinas.mockResolvedValue([{ id_maquina: 1, nombre: 'M1', modelo: '', sistemas_pago: [] }]);

    const response = await request(app).get('/api/maquinas');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: [{ id_maquina: 1, nombre: 'M1', modelo: '', sistemas_pago: [] }] });
  });

  it('GET /api/maquinas/:id returns legacy configuration unchanged', async () => {
    const legacy = { id_maquina: 1, modelo: '', sistemas_pago: [] };
    mockedService.getMaquinaById.mockResolvedValue(legacy);
    const response = await request(app).get('/api/maquinas/1');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(legacy);
  });

  it('GET /api/maquinas/:id returns 404 when maquina does not exist', async () => {
    mockedService.getMaquinaById.mockResolvedValue(undefined);

    const response = await request(app).get('/api/maquinas/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Maquina no encontrada');
  });

  it('POST /api/maquinas creates a maquina', async () => {
    mockedService.createMaquina.mockResolvedValue({ id_maquina: 1, ...payload });

    const response = await request(app).post('/api/maquinas').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ id_maquina: 1, ...payload });
    expect(mockedService.createMaquina).toHaveBeenCalledWith(payload);
  });

  it('POST /api/maquinas returns 400 when required fields are missing', async () => {
    const response = await request(app).post('/api/maquinas').send({ nombre: 'Maquina 1' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Todos los campos son obligatorios');
  });

  it('PUT /api/maquinas/:id updates a maquina', async () => {
    mockedService.updateMaquina.mockResolvedValue({ id_maquina: 1, ...payload });

    const response = await request(app).put('/api/maquinas/1').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id_maquina: 1, ...payload });
    expect(mockedService.updateMaquina).toHaveBeenCalledWith(payload, 1);
  });

  it.each([undefined, null, '', '   ', '\t\n', 123, true, {}, []].map(modelo => ({ modelo })))('rejects invalid modelo $modelo on POST and PUT', async ({ modelo }) => {
    for (const method of ['post', 'put'] as const) {
      const response = await request(app)[method](`/api/maquinas${method === 'put' ? '/1' : ''}`).send({ ...payload, modelo });
      expect(response.status).toBe(400);
    }
    expect(mockedService.createMaquina).not.toHaveBeenCalled();
    expect(mockedService.updateMaquina).not.toHaveBeenCalled();
  });

  it.each([undefined, null, [], 'MONEDA', {}, [null], [1], ['moneda'], [' MONEDA '], ['OTRO'], ['MONEDA', 'MONEDA'], [['MONEDA']], ['MONEDA', null]].map(sistemas_pago => ({ sistemas_pago })))('rejects invalid sistemas_pago $sistemas_pago on POST and PUT', async ({ sistemas_pago }) => {
    for (const method of ['post', 'put'] as const) {
      const response = await request(app)[method](`/api/maquinas${method === 'put' ? '/1' : ''}`).send({ ...payload, sistemas_pago });
      expect(response.status).toBe(400);
    }
    expect(mockedService.createMaquina).not.toHaveBeenCalled();
    expect(mockedService.updateMaquina).not.toHaveBeenCalled();
  });

  it.each([['MONEDA'], ['BILLETE'], ['TARJETA'], ['TARJETA', 'MONEDA', 'BILLETE']].map(sistemas_pago => ({ sistemas_pago })))('accepts payment configuration $sistemas_pago and trims modelo on POST and PUT', async ({ sistemas_pago }) => {
    const normalized = { ...payload, modelo: 'Modelo del sur', sistemas_pago };
    mockedService.createMaquina.mockResolvedValue({ id_maquina: 1, ...normalized });
    mockedService.updateMaquina.mockResolvedValue({ id_maquina: 1, ...normalized });
    for (const method of ['post', 'put'] as const) {
      const response = await request(app)[method](`/api/maquinas${method === 'put' ? '/1' : ''}`).send({ ...normalized, modelo: ' \tModelo del sur\n ' });
      expect(response.status).toBe(method === 'post' ? 201 : 200);
      expect(response.body.data).toEqual({ id_maquina: 1, ...normalized });
    }
    expect(mockedService.createMaquina).toHaveBeenCalledWith(normalized);
    expect(mockedService.updateMaquina).toHaveBeenCalledWith(normalized, 1);
  });

  it.each(['codigo', 'nombre', 'descripcion', 'ubicacion', 'estado'])('keeps complete PUT requiring %s', async (field) => {
    const response = await request(app).put('/api/maquinas/1').send({ ...payload, [field]: undefined });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Todos los campos son obligatorios');
    expect(mockedService.updateMaquina).not.toHaveBeenCalled();
  });

  it('DELETE /api/maquinas/:id deletes a maquina', async () => {
    mockedService.getMaquinaById.mockResolvedValue({ id_maquina: 1 });
    mockedService.deleteMaquina.mockResolvedValue(undefined);

    const response = await request(app).delete('/api/maquinas/1');

    expect(response.status).toBe(204);
    expect(mockedService.deleteMaquina).toHaveBeenCalledWith(1);
  });
});
