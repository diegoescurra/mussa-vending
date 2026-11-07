import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './producto.route.js';

jest.mock('../config/db.js', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

const app = createTestApp(router);
const query = pool.query as jest.Mock;

describe('productos writes with real service and mocked database', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it.each([
    { method: 'post', url: '/api/productos', fields: { precio_venta: 'NaN' }, label: 'Precio de venta' },
    { method: 'put', url: '/api/productos/1', fields: { costo_compra: 'NaN' }, label: 'Costo de compra' },
    { method: 'put', url: '/api/productos/1', fields: { costo_compra: -1 }, label: 'Costo de compra' },
    { method: 'post', url: '/api/productos', fields: { precio_venta: 10000000000 }, label: 'Precio de venta' },
  ] as const)('$method rejects invalid catalog amounts: $fields', async ({ method, url, fields, label }) => {
    const response = await request(app)[method](url)
      .send({ nombre: 'Snack', id_proveedor: null, precio_venta: 1200, costo_compra: 800, ...fields });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain(label);
    expect(query).not.toHaveBeenCalled();
  });

  it('deletes an existing product and returns an empty 204 response', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app).delete('/api/productos/1');

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenLastCalledWith('DELETE FROM productos WHERE id_producto = $1', [1]);
  });

  it('returns 404 when DELETE affects no product', async () => {
    query.mockResolvedValueOnce({ rowCount: 0 });

    const response = await request(app).delete('/api/productos/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Producto no encontrado');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns an actionable conflict without leaking FK details', async () => {
    query.mockRejectedValueOnce(Object.assign(new Error('internal FK details'), { code: '23503' }));

    const response = await request(app).delete('/api/productos/1');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      status: 'fail',
      message: 'No se puede eliminar este producto porque esta asociado a inventario o tiene historial registrado.',
    });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([
    Object.assign(new Error('database unavailable'), { code: '08006' }),
    new Error('unexpected failure'),
  ])('keeps unexpected errors as 500 rather than misreporting an inventory conflict', async (error) => {
    query.mockRejectedValueOnce(error);

    const response = await request(app).delete('/api/productos/1');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ status: 'error', message: 'Error interno del servidor' });
  });
});
