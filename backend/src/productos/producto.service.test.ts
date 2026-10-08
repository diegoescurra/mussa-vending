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

describe('producto deletion with real service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('deletes an existing product and returns an empty 204 response', async () => {
    query.mockResolvedValueOnce({ rows: [{ id_producto: 1 }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const response = await request(app).delete('/api/productos/1');

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(query).toHaveBeenLastCalledWith('DELETE FROM productos WHERE id_producto = $1', [1]);
  });

  it('returns 404 without attempting deletion when the product does not exist', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).delete('/api/productos/999');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Producto no encontrado');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns an actionable conflict without leaking FK details', async () => {
    query.mockResolvedValueOnce({ rows: [{ id_producto: 1 }] })
      .mockRejectedValueOnce(Object.assign(new Error('internal FK details'), { code: '23503' }));

    const response = await request(app).delete('/api/productos/1');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      status: 'fail',
      message: 'No se puede eliminar este producto porque esta asociado a inventario o tiene historial registrado.',
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it.each([
    Object.assign(new Error('database unavailable'), { code: '08006' }),
    new Error('unexpected failure'),
  ])('keeps unexpected errors as 500 rather than misreporting an inventory conflict', async (error) => {
    query.mockResolvedValueOnce({ rows: [{ id_producto: 1 }] })
      .mockRejectedValueOnce(error);

    const response = await request(app).delete('/api/productos/1');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ status: 'error', message: 'Error interno del servidor' });
  });
});
