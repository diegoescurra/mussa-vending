import request from 'supertest';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './usuario.route.js';
import * as service from './usuario.service.js';

jest.mock('./usuario.service.js');

const app = createTestApp(router);
const mockedService = jest.mocked(service);

describe('usuarios routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/usuarios returns usuarios', async () => {
    mockedService.getAllUsuarios.mockResolvedValue([{ id_usuario: 1, nombre: 'Admin', rol: 'ADMIN' }]);

    const response = await request(app).get('/api/usuarios');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: [{ id_usuario: 1, nombre: 'Admin', rol: 'ADMIN' }] });
  });

  it('GET /api/usuarios/:id returns 404 when usuario does not exist', async () => {
    mockedService.getUsuarioById.mockResolvedValue(undefined);

    const response = await request(app).get('/api/usuarios/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Usuario no encontrado');
  });

  it('POST /api/usuarios creates a usuario', async () => {
    const payload = { nombre: 'Juan', apellido: 'Pérez', email: 'juan@mussa.cl', password_hash: 'pendiente', rol: 'REPONEDOR' };
    mockedService.createUsuario.mockResolvedValue({ id_usuario: 1, ...payload, estado: true });

    const response = await request(app).post('/api/usuarios').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ id_usuario: 1, ...payload, estado: true });
    expect(mockedService.createUsuario).toHaveBeenCalledWith(payload);
  });

  it('POST /api/usuarios uses password_hash pendiente by default', async () => {
    const payload = { nombre: 'Juan', apellido: 'Pérez', email: 'juan@mussa.cl', rol: 'REPONEDOR' };
    mockedService.createUsuario.mockResolvedValue({ id_usuario: 1, ...payload, estado: true });

    const response = await request(app).post('/api/usuarios').send(payload);

    expect(response.status).toBe(201);
    expect(mockedService.createUsuario).toHaveBeenCalledWith({ ...payload, password_hash: 'pendiente' });
  });

  it('POST /api/usuarios returns 400 for invalid rol', async () => {
    const payload = { nombre: 'Juan', apellido: 'Pérez', email: 'juan@mussa.cl', password_hash: 'pendiente', rol: 'OPERADOR' };

    const response = await request(app).post('/api/usuarios').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Rol invalido');
  });

  it('PUT /api/usuarios/:id updates a usuario', async () => {
    const payload = { nombre: 'Juan', estado: false };
    mockedService.updateUsuario.mockResolvedValue({ id_usuario: 1, nombre: 'Juan', estado: false });

    const response = await request(app).put('/api/usuarios/1').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id_usuario: 1, nombre: 'Juan', estado: false });
    expect(mockedService.updateUsuario).toHaveBeenCalledWith(payload, 1);
  });

  it('DELETE /api/usuarios/:id deletes a usuario', async () => {
    mockedService.getUsuarioById.mockResolvedValue({ id_usuario: 1 });
    mockedService.deleteUsuario.mockResolvedValue(undefined);

    const response = await request(app).delete('/api/usuarios/1');

    expect(response.status).toBe(204);
    expect(mockedService.deleteUsuario).toHaveBeenCalledWith(1);
  });
});
