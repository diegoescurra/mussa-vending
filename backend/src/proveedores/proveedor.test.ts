import request from 'supertest';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './proveedor.route.js';
import * as service from './proveedor.service.js';

jest.mock('./proveedor.service.js');

const app = createTestApp(router);
const mockedService = jest.mocked(service);

describe('proveedores routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/proveedores returns proveedores', async () => {
    mockedService.getAllProveedores.mockResolvedValue([{ id_proveedor: 1, nombre: 'Proveedor 1' }]);

    const response = await request(app).get('/api/proveedores');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: [{ id_proveedor: 1, nombre: 'Proveedor 1' }] });
  });

  it('GET /api/proveedores/:id returns 404 when proveedor does not exist', async () => {
    mockedService.getProveedorById.mockResolvedValue(undefined);

    const response = await request(app).get('/api/proveedores/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Proveedor no encontrado');
  });

  it('POST /api/proveedores creates a proveedor', async () => {
    mockedService.createProveedor.mockResolvedValue({ id_proveedor: 1, nombre: 'Proveedor 1' });

    const response = await request(app).post('/api/proveedores').send({ nombre: 'Proveedor 1' });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ id_proveedor: 1, nombre: 'Proveedor 1' });
    expect(mockedService.createProveedor).toHaveBeenCalledWith({ nombre: 'Proveedor 1' });
  });

  it('POST /api/proveedores returns 400 when required fields are missing', async () => {
    const response = await request(app).post('/api/proveedores').send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Todos los campos son obligatorios');
  });

  it('PUT /api/proveedores/:id updates a proveedor', async () => {
    const payload = { nombre: 'Proveedor 1', estado: true };
    mockedService.updateProveedor.mockResolvedValue({ id_proveedor: 1, ...payload });

    const response = await request(app).put('/api/proveedores/1').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id_proveedor: 1, ...payload });
    expect(mockedService.updateProveedor).toHaveBeenCalledWith(payload, 1);
  });

  it('DELETE /api/proveedores/:id deletes a proveedor', async () => {
    mockedService.getProveedorById.mockResolvedValue({ id_proveedor: 1 });
    mockedService.deleteProveedor.mockResolvedValue(undefined);

    const response = await request(app).delete('/api/proveedores/1');

    expect(response.status).toBe(204);
    expect(mockedService.deleteProveedor).toHaveBeenCalledWith(1);
  });
});
