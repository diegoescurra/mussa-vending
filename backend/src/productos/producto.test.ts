import request from 'supertest';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './producto.route.js';
import * as service from './producto.service.js';

jest.mock('./producto.service.js');

const app = createTestApp(router);
const mockedService = jest.mocked(service);

describe('productos routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/productos returns productos', async () => {
    mockedService.getAllProductos.mockResolvedValue([{ id_producto: 1, nombre: 'Snack' }]);

    const response = await request(app).get('/api/productos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: [{ id_producto: 1, nombre: 'Snack' }] });
  });

  it('GET /api/productos/:id returns 404 when producto does not exist', async () => {
    mockedService.getProductoById.mockResolvedValue(undefined);

    const response = await request(app).get('/api/productos/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Producto no encontrado');
  });

  it('POST /api/productos creates a producto', async () => {
    const payload = { nombre: 'Snack', id_proveedor: 1, precio_venta: 1200, costo_compra: 800 };
    mockedService.createProducto.mockResolvedValue({ id_producto: 1, ...payload });

    const response = await request(app).post('/api/productos').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ id_producto: 1, ...payload });
    expect(mockedService.createProducto).toHaveBeenCalledWith(payload);
  });

  it('POST /api/productos returns 400 when required fields are missing', async () => {
    const response = await request(app).post('/api/productos').send({ nombre: 'Snack' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Todos los campos son obligatorios');
  });

  it('PUT /api/productos/:id updates a producto', async () => {
    const payload = { nombre: 'Snack', id_proveedor: 1, precio_venta: 1300, costo_compra: 800 };
    mockedService.updateProducto.mockResolvedValue({ id_producto: 1, ...payload });

    const response = await request(app).put('/api/productos/1').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id_producto: 1, ...payload });
    expect(mockedService.updateProducto).toHaveBeenCalledWith(payload, 1);
  });

  it('DELETE /api/productos/:id deletes a producto', async () => {
    mockedService.getProductoById.mockResolvedValue({ id_producto: 1 });
    mockedService.deleteProducto.mockResolvedValue(undefined);

    const response = await request(app).delete('/api/productos/1');

    expect(response.status).toBe(204);
    expect(mockedService.deleteProducto).toHaveBeenCalledWith(1);
  });
});
