import request from 'supertest';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './reposicion.route.js';
import * as service from './reposicion.service.js';

jest.mock('./reposicion.service.js');

const app = createTestApp(router);
const mockedService = jest.mocked(service);

const payload = {
  id_maquina: 1,
  dinero_retirado: 5000,
  venta_esperada: 4500,
  diferencia_dinero: 500,
  detalles: [{
    id_maquina_producto: 2,
    stock_sistema: 10,
    stock_encontrado: 6,
    cantidad_vendida: 4,
    cantidad_repuesta: 4,
    cantidad_retirada: 0,
    stock_final: 10,
    precio_venta_actual: 1000,
    venta_esperada: 4000,
  }],
};

describe('reposiciones routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/reposiciones creates a reposicion', async () => {
    mockedService.createReposicion.mockResolvedValue({ id_reposicion: 1, ...payload });

    const response = await request(app).post('/api/reposiciones').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({ id_reposicion: 1, ...payload });
    expect(mockedService.createReposicion).toHaveBeenCalledWith(payload);
  });
});
