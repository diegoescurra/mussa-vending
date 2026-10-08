import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import router from './maquina-producto.route.js';
import { createMaquinaProducto, updateMaquinaProducto } from './maquina-producto.service.js';
import type { CreateMaquinaProductoDTO, UpdateMaquinaProductoDTO } from './maquina-producto.type.js';

jest.mock('../config/db.js', () => ({
    __esModule: true,
    default: { query: jest.fn() },
}));

const app = createTestApp(router);
const query = pool.query as jest.Mock;
const payload = { id_maquina: 1, id_producto: 2, capacidad_maxima: 20, stock_actual: 10, precio_venta_actual: 12.34 };
const existing = { id_maquina_producto: 1, ...payload, precio_venta_actual: '12.34', estado: true };

const invalidFields = [
    ...['id_maquina', 'id_producto'].flatMap(field =>
        [null, '1', true, 0, -1, 1.5, 2147483648].map(value => ({ [field]: value }))),
    ...['capacidad_maxima', 'stock_actual'].flatMap(field =>
        [null, '10', false, -1, 0.5, 2147483648].map(value => ({ [field]: value }))),
    ...[null, '12.34', true, -0.01, 1.001, 0.0000001, 10000000000].map(value => ({ precio_venta_actual: value })),
];

describe('maquina-productos writes with real service and mocked database', () => {
    beforeEach(() => jest.resetAllMocks());

    it.each(invalidFields)('POST rejects invalid numeric fields before SQL: %j', async (fields) => {
        const response = await request(app).post('/api/maquina-productos').send({ ...payload, ...fields });
        expect(response.status).toBe(400);
        const field = Object.keys(fields)[0];
        const messages: Record<string, string> = {
            id_maquina: 'Seleccione una maquina valida',
            id_producto: 'Seleccione un producto valido',
            capacidad_maxima: 'Capacidad maxima debe ser un entero entre 0 y 2147483647',
            stock_actual: 'Stock actual debe ser un entero entre 0 y 2147483647',
            precio_venta_actual: 'Precio actual debe estar entre 0 y 9999999999.99 y tener hasta 2 decimales',
        };
        expect(response.body.message).toBe(messages[field!]);
        expect(query).not.toHaveBeenCalled();
    });

    it.each(invalidFields.filter(fields => !('id_maquina' in fields) && !('id_producto' in fields)))('PUT rejects invalid numeric fields before SELECT: %j', async (fields) => {
        const response = await request(app).put('/api/maquina-productos/1').send(fields);
        expect(response.status).toBe(400);
        expect(query).not.toHaveBeenCalled();
    });

    it.each([null, 'false', 0, 1, {}, []])('PUT rejects non-boolean estado: %j', async (estado) => {
        const response = await request(app).put('/api/maquina-productos/1').send({ estado });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Estado debe ser verdadero o falso');
        expect(query).not.toHaveBeenCalled();
    });

    it.each(['abc', '0', '-1', '1.5', '2147483648', 'Infinity', '1e0', '0x1', '%20'])('PUT rejects invalid HTTP ID %s before SQL', async (id) => {
        const response = await request(app).put(`/api/maquina-productos/${id}`).send({ stock_actual: 1 });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Seleccione una asignacion valida');
        expect(query).not.toHaveBeenCalled();
    });

    it.each(['post', 'put'] as const)('%s rejects missing fields and array data without SQL', async (method) => {
        for (const body of [{}, []]) {
            const url = `/api/maquina-productos${method === 'put' ? '/1' : ''}`;
            const response = await request(app)[method](url).send(body);
            expect(response.status).toBe(400);
            expect(response.body.message).toBe(Array.isArray(body)
                ? 'Los datos enviados deben ser un objeto'
                : method === 'post' ? 'Todos los campos son obligatorios' : 'Debe enviar al menos un campo para actualizar');
        }
        expect(query).not.toHaveBeenCalled();
    });

    it('POST rejects stock exceeding capacity before SQL', async () => {
        const response = await request(app).post('/api/maquina-productos').send({ ...payload, stock_actual: 21 });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Stock actual no puede superar la capacidad maxima');
        expect(query).not.toHaveBeenCalled();
    });

    it.each([{ stock_actual: 21 }, { capacidad_maxima: 9 }])('PUT validates partial relationship against existing state: %j', async (body) => {
        query.mockResolvedValueOnce({ rows: [{ ...existing, capacidad_maxima: '20', stock_actual: '10' }] });
        const response = await request(app).put('/api/maquina-productos/1').send(body);
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Stock actual no puede superar la capacidad maxima');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('PUT rejects an invalid supplied relationship before SELECT', async () => {
        const response = await request(app).put('/api/maquina-productos/1').send({ capacidad_maxima: 0, stock_actual: 1 });
        expect(response.status).toBe(400);
        expect(query).not.toHaveBeenCalled();
    });

    it.each([
        { ...payload, capacidad_maxima: 0, stock_actual: 0, precio_venta_actual: 0 },
        { ...payload, id_maquina: 2147483647, id_producto: 2147483647, capacidad_maxima: 2147483647, stock_actual: 2147483647, precio_venta_actual: 9999999999.99 },
        { ...payload, precio_venta_actual: 0.29 },
    ])('POST accepts boundaries and preserves the create contract: %j', async (body) => {
        query.mockResolvedValueOnce({ rows: [{ id_maquina_producto: 1, ...body, estado: true }] });
        const response = await request(app).post('/api/maquina-productos').send({ ...body, estado: false });
        expect(response.status).toBe(201);
        expect(response.body.data.estado).toBe(true);
        expect(query).toHaveBeenCalledWith(expect.not.stringContaining('estado'), Object.values(body));
    });

    it.each([
        { stock_actual: 20 }, { capacidad_maxima: 10 }, { precio_venta_actual: 0.29 },
        { estado: false }, { capacidad_maxima: 0, stock_actual: 0 },
        { capacidad_maxima: 2147483647, stock_actual: 2147483647, precio_venta_actual: 9999999999.99 },
    ])('PUT accepts valid partial state with existing pg numeric strings: %j', async (body) => {
        const updated = { ...existing, ...body };
        query.mockResolvedValueOnce({ rows: [existing] }).mockResolvedValueOnce({ rows: [updated] });
        const response = await request(app).put('/api/maquina-productos/1').send(body);
        expect(response.status).toBe(200);
        expect(response.body.data).toEqual(updated);
        const data = body as UpdateMaquinaProductoDTO;
        expect(query).toHaveBeenLastCalledWith(expect.stringContaining('COALESCE'), [data.capacidad_maxima, data.stock_actual, data.precio_venta_actual, data.estado, 1]);
    });

    it('PUT returns 404 without UPDATE when the relation is missing', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        const response = await request(app).put('/api/maquina-productos/1').send({ stock_actual: 1 });
        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Producto de maquina no encontrado');
        expect(query).toHaveBeenCalledTimes(1);
    });

    it.each(['post', 'put'] as const)('%s translates only expected write errors', async (method) => {
        const errors = [
            { code: '23505', status: 409, message: 'Producto ya asignado a esta maquina' },
            { code: '23503', status: 400, message: 'La maquina o el producto no existe' },
            ...['maquina_productos', 'maquinas_productos'].flatMap(table => [
                { code: '23514', constraint: `${table}_stock_actual_check`, status: 400, message: 'Stock actual debe estar entre 0 y la capacidad maxima' },
                { code: '23514', constraint: `${table}_check`, status: 400, message: 'Stock actual debe estar entre 0 y la capacidad maxima' },
                { code: '23514', constraint: `${table}_capacidad_maxima_check`, status: 400, message: 'Capacidad maxima debe ser mayor o igual a 0' },
                { code: '23514', constraint: `${table}_precio_venta_actual_check`, status: 400, message: 'Precio actual debe ser mayor o igual a 0' },
            ]),
            { code: '23514', constraint: 'unexpected_stock_actual_check', status: 500, message: 'Error interno del servidor' },
            { code: '23514', constraint: 'maquina_productos_check1', status: 500, message: 'Error interno del servidor' },
            { code: '23514', status: 500, message: 'Error interno del servidor' },
            { code: '08006', status: 500, message: 'Error interno del servidor' },
            { status: 500, message: 'Error interno del servidor' },
        ];
        for (const error of errors) {
            query.mockReset();
            if (method === 'put') query.mockResolvedValueOnce({ rows: [existing] });
            query.mockRejectedValueOnce(Object.assign(new Error('internal database details'), error));
            const response = await request(app)[method](`/api/maquina-productos${method === 'put' ? '/1' : ''}`)
                .send(method === 'post' ? payload : { stock_actual: 20 });
            expect(response.status).toBe(error.status);
            expect(response.body.message).toBe(error.message);
        }
    });

    it('keeps SELECT failures as unexpected server errors', async () => {
        query.mockRejectedValueOnce(new Error('database unavailable'));
        const response = await request(app).put('/api/maquina-productos/1').send({ stock_actual: 1 });
        expect(response.status).toBe(500);
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('service also rejects invalid runtime inputs and non-finite numbers before SQL', async () => {
        for (const value of [NaN, Infinity, -Infinity]) {
            for (const field of Object.keys(payload)) {
                await expect(createMaquinaProducto({ ...payload, [field]: value })).rejects.toMatchObject({ statusCode: 400 });
            }
            await expect(updateMaquinaProducto({ stock_actual: 1 }, value)).rejects.toMatchObject({ statusCode: 400 });
            await expect(updateMaquinaProducto({ precio_venta_actual: value }, 1)).rejects.toMatchObject({ statusCode: 400 });
        }
        for (const body of [null, undefined, [], 'invalid']) {
            await expect(createMaquinaProducto(body as unknown as CreateMaquinaProductoDTO)).rejects.toMatchObject({ statusCode: 400 });
            await expect(updateMaquinaProducto(body as unknown as UpdateMaquinaProductoDTO, 1)).rejects.toMatchObject({ statusCode: 400 });
        }
        expect(query).not.toHaveBeenCalled();
    });
});
