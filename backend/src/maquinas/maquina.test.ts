import request from 'supertest';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './route.maquina.js';
import * as service from './service.maquina.js';

jest.mock('./service.maquina.js');

const app = createTestApp(router);
const mockedService = jest.mocked(service);

describe('maquinas routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/maquinas returns maquinas', async () => {
    mockedService.getAllMaquinas.mockResolvedValue([{ id_maquina: 1, nombre: 'M1' }]);

    const response = await request(app).get('/api/maquinas');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: [{ id_maquina: 1, nombre: 'M1' }] });
  });

  it('GET /api/maquinas/:id returns 404 when maquina does not exist', async () => {
    mockedService.getMaquinaById.mockResolvedValue(undefined);

    const response = await request(app).get('/api/maquinas/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Maquina no encontrada');
  });

  it('POST /api/maquinas creates a maquina', async () => {
    const payload = { codigo: 'M-001', nombre: 'Maquina 1', descripcion: 'Desc', ubicacion: 'Local', estado: 'ACTIVA' };
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
    const payload = { codigo: 'M-001', nombre: 'Maquina 1', descripcion: 'Desc', ubicacion: 'Local', estado: 'ACTIVA' };
    mockedService.updateMaquina.mockResolvedValue({ id_maquina: 1, ...payload });

    const response = await request(app).put('/api/maquinas/1').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id_maquina: 1, ...payload });
    expect(mockedService.updateMaquina).toHaveBeenCalledWith(payload, 1);
  });

  it('DELETE /api/maquinas/:id deletes a maquina', async () => {
    mockedService.getMaquinaById.mockResolvedValue({ id_maquina: 1 });
    mockedService.deleteMaquina.mockResolvedValue(undefined);

    const response = await request(app).delete('/api/maquinas/1');

    expect(response.status).toBe(204);
    expect(mockedService.deleteMaquina).toHaveBeenCalledWith(1);
  });
});
