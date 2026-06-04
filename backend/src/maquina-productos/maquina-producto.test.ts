import request from 'supertest';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './maquina-producto.route.js';
import * as service from './maquina-producto.service.js';

jest.mock('./maquina-producto.service.js');

const app = createTestApp(router);
const mockedService = jest.mocked(service);

describe('maquina-productos routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/maquina-productos returns maquina productos', async () => {
    mockedService.getAllMaquinaProductos.mockResolvedValue([{ id_maquina_producto: 1, producto_nombre: 'Snack' }]);

    const response = await request(app).get('/api/maquina-productos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: [{ id_maquina_producto: 1, producto_nombre: 'Snack' }] });
  });

  it('GET /api/maquina-productos/:id returns 404 when relation does not exist', async () => {
    mockedService.getMaquinaProductoById.mockResolvedValue(undefined);

    const response = await request(app).get('/api/maquina-productos/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Producto de maquina no encontrado');
  });

  it('POST /api/maquina-productos creates a relation', async () => {
    const payload = { id_maquina: 1, id_producto: 2, capacidad_maxima: 20, stock_actual: 10, precio_venta_actual: 1500 };
    mockedService.createMaquinaProducto.mockResolvedValue({ id_maquina_producto: 1, ...payload });

    const response = await request(app).post('/api/maquina-productos').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ id_maquina_producto: 1, ...payload });
    expect(mockedService.createMaquinaProducto).toHaveBeenCalledWith(payload);
  });

  it('POST /api/maquina-productos returns 400 when required fields are missing', async () => {
    const response = await request(app).post('/api/maquina-productos').send({ id_maquina: 1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Todos los campos son obligatorios');
  });

  it('PUT /api/maquina-productos/:id updates a relation partially', async () => {
    const payload = { stock_actual: 12 };
    mockedService.updateMaquinaProducto.mockResolvedValue({ id_maquina_producto: 1, stock_actual: 12 });

    const response = await request(app).put('/api/maquina-productos/1').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id_maquina_producto: 1, stock_actual: 12 });
    expect(mockedService.updateMaquinaProducto).toHaveBeenCalledWith(payload, 1);
  });

  it('PUT /api/maquina-productos/:id returns 400 when no fields are sent', async () => {
    const response = await request(app).put('/api/maquina-productos/1').send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Debe enviar al menos un campo para actualizar');
  });

  it('DELETE /api/maquina-productos/:id deletes a relation', async () => {
    mockedService.getMaquinaProductoById.mockResolvedValue({ id_maquina_producto: 1 });
    mockedService.deleteMaquinaProducto.mockResolvedValue(undefined);

    const response = await request(app).delete('/api/maquina-productos/1');

    expect(response.status).toBe(204);
    expect(mockedService.deleteMaquinaProducto).toHaveBeenCalledWith(1);
  });
});
