import request from 'supertest';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './producto.route.js';
import * as service from './producto.service.js';
import type { Producto } from './producto.type.js';

jest.mock('./producto.service.js');

const app = createTestApp(router);
const mockedService = jest.mocked(service);
const producto: Producto = {
  id_producto: 1,
  nombre: 'Snack',
  id_proveedor: 1,
  precio_venta: '1200.00',
  costo_compra: '800.00',
  estado: true,
  fecha_creacion: new Date('2026-01-01T00:00:00Z'),
};
const productoJson = { ...producto, fecha_creacion: producto.fecha_creacion.toISOString() };

describe('productos routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/productos returns productos', async () => {
    mockedService.getAllProductos.mockResolvedValue([producto]);

    const response = await request(app).get('/api/productos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: [productoJson] });
  });

  it('GET /api/productos/:id returns 404 when producto does not exist', async () => {
    mockedService.getProductoById.mockResolvedValue(undefined);

    const response = await request(app).get('/api/productos/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Producto no encontrado');
  });

  it('rejects a nondecimal product ID before calling the service', async () => {
    const response = await request(app).delete('/api/productos/1e0');
    expect(response.status).toBe(400);
    expect(mockedService.deleteProducto).not.toHaveBeenCalled();
  });

  it('POST /api/productos creates a producto', async () => {
    const payload = { nombre: 'Snack', id_proveedor: 1, precio_venta: 1200, costo_compra: 0 };
    mockedService.createProducto.mockResolvedValue({ ...producto, costo_compra: '0.00' });

    const response = await request(app).post('/api/productos').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ ...productoJson, costo_compra: '0.00' });
    expect(mockedService.createProducto).toHaveBeenCalledWith(payload);
  });

  it('POST /api/productos returns 400 when required fields are missing', async () => {
    const response = await request(app).post('/api/productos').send({ nombre: 'Snack' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Todos los campos son obligatorios');
  });

  it('PUT /api/productos/:id updates a producto', async () => {
    const payload = { nombre: 'Snack', id_proveedor: 1, precio_venta: '1300.50', costo_compra: 800 };
    mockedService.updateProducto.mockResolvedValue({ ...producto, precio_venta: '1300.50' });

    const response = await request(app).put('/api/productos/1').send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ ...productoJson, precio_venta: '1300.50' });
    expect(mockedService.updateProducto).toHaveBeenCalledWith({ ...payload, precio_venta: 1300.5 }, 1);
  });
});
