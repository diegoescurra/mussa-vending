import request from 'supertest';
import pool from '../config/db.js';
import { createTestApp } from '../test-utils/createTestApp.js';
import routes from '../routes/routes.js';
import { getDashboard } from './dashboard.service.js';

jest.mock('../config/db.js', () => ({
  __esModule: true,
  default: { query: jest.fn(), connect: jest.fn() },
}));

const app = createTestApp(routes);
const query = pool.query as jest.Mock;
const periodo = { desde: '2026-09-01', hasta: '2026-09-30' };
const emptyDashboard = {
  periodo,
  indicadores: { dinero_retirado: 0, venta_estimada: 0, diferencia_caja: 0, visitas: 0 },
  anterior: { dinero_retirado: 0, venta_estimada: 0, diferencia_caja: 0, visitas: 0 },
  productos: [],
  maquinas: { activas: 0, inactivas: 0, mantencion: 0 },
  stock: { agotados: 0, bajos: 0 },
  atencion: [],
  ultimas_visitas: [],
  evolucion: [],
  diferencias_maquinas: [],
  proveedores: {
    activos: 0, inactivos: 0, productos_sin_proveedor: 0,
    venta_estimada: 0, costo_estimado: 0, margen_estimado: 0, productos_costo_cero: 0, detalle: [],
  },
};

describe('dashboard service and route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('AS diferencia_caja') && !sql.includes('JOIN')) return { rows: [emptyDashboard.indicadores] };
      if (sql.includes('AS activas')) return { rows: [emptyDashboard.maquinas] };
      if (sql.includes('AS activos')) return { rows: [emptyDashboard.proveedores] };
      return { rows: [] };
    });
  });

  it.each([
    '', 'desde=2026-09-01', 'hasta=2026-09-30',
    'desde=&hasta=2026-09-30', 'desde=2026-9-01&hasta=2026-09-30',
    'desde=2026-02-29&hasta=2026-09-30', 'desde=2024-02-30&hasta=2026-09-30',
    'desde=2026-04-31&hasta=2026-09-30', 'desde=2026-00-01&hasta=2026-09-30',
    'desde=2026-13-01&hasta=2026-09-30', 'desde=0000-01-01&hasta=2026-09-30',
    'desde=2026-09-01&hasta=2026-09-31', 'desde=2026-10-01&hasta=2026-09-30',
    'desde=2026-09-01T00:00:00Z&hasta=2026-09-30',
    'desde=2026-09-01&desde=2026-09-02&hasta=2026-09-30',
    'desde=2026-09-01&hasta=2026-09-30&hasta=2026-10-01',
    'desde=2026-09-01%20&hasta=2026-09-30',
  ])('rejects invalid or missing dates before querying: %s', async (params) => {
    expect((await request(app).get(`/api/dashboard?${params}`)).status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it.each(['2024-02-29', '2026-09-06', '2026-12-31', '0099-01-01', '9999-12-31'])(
    'accepts a real single-day range: %s', async (date) => {
      const response = await request(app).get('/api/dashboard').query({ desde: date, hasta: date });
      expect(response.status).toBe(200);
      expect(response.body.data.periodo).toEqual({ desde: date, hasta: date });
      expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM reposiciones r WHERE'), [date, date]);
    },
  );

  it('returns the empty contract in the shared API success envelope', async () => {
    const response = await request(app).get('/api/dashboard').query(periodo);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: emptyDashboard });
    expect(query).toHaveBeenCalledTimes(10);
  });

  it('converts PostgreSQL numeric/count values and timestamps, preserving zero-unit visits and nulls', async () => {
    query.mockResolvedValueOnce({ rows: [{ dinero_retirado: '1500.50', venta_estimada: '2000.75',
      diferencia_caja: '-500.25', visitas: '12' }] })
      .mockResolvedValueOnce({ rows: [{ activas: '3', inactivas: '2', mantencion: '1' }] })
      .mockResolvedValueOnce({ rows: [
        { id_maquina: 7, nombre: 'A', ubicacion: 'Centro', agotados: '2', bajos: '1',
          ultima_visita: new Date('2026-10-01T03:00:00Z') },
        { id_maquina: 8, nombre: 'B', ubicacion: 'Sur', agotados: '0', bajos: '2', ultima_visita: null },
      ] })
      .mockResolvedValueOnce({ rows: [
        { id_reposicion: 9, fecha: new Date('2026-09-30T15:00:00Z'), maquina: 'A', responsable: 'Ana Perez',
          unidades_repuestas: '5', dinero_retirado: '1500.50' },
        { id_reposicion: 8, fecha: '2026-09-01T04:00:00Z', maquina: 'B', responsable: null,
          unidades_repuestas: '0', dinero_retirado: '0.00' },
      ] });

    const response = await request(app).get('/api/dashboard').query(periodo);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.data).toEqual({
      ...emptyDashboard,
      periodo,
      indicadores: { dinero_retirado: 1500.5, venta_estimada: 2000.75, diferencia_caja: -500.25, visitas: 12 },
      maquinas: { activas: 3, inactivas: 2, mantencion: 1 },
      stock: { agotados: 2, bajos: 3 },
      atencion: [
        { id_maquina: 7, nombre: 'A', ubicacion: 'Centro', agotados: 2, bajos: 1, ultima_visita: '2026-10-01T03:00:00.000Z' },
        { id_maquina: 8, nombre: 'B', ubicacion: 'Sur', agotados: 0, bajos: 2, ultima_visita: null },
      ],
      ultimas_visitas: [
        { id_reposicion: 9, fecha: '2026-09-30T15:00:00.000Z', maquina: 'A', responsable: 'Ana Perez',
          unidades_repuestas: 5, dinero_retirado: 1500.5 },
        { id_reposicion: 8, fecha: '2026-09-01T04:00:00.000Z', maquina: 'B', responsable: null,
          unidades_repuestas: 0, dinero_retirado: 0 },
      ],
    });
  });

  it('returns exact new shapes with numeric values, signed margins, unsold suppliers and null attribution', async () => {
    query.mockResolvedValueOnce({ rows: [{ dinero_retirado: '9000', venta_estimada: '10000',
      diferencia_caja: '-1000', visitas: '4' }] })
      .mockResolvedValueOnce({ rows: [emptyDashboard.maquinas] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [
        { fecha: '2026-09-01', dinero_retirado: '9000', venta_estimada: '10000', visitas: '3' },
        { fecha: '2026-09-30', dinero_retirado: '0', venta_estimada: '0', visitas: '1' },
      ] })
      .mockResolvedValueOnce({ rows: [
        { id_maquina: '7', nombre: 'A', dinero_retirado: '0', venta_estimada: '1500', diferencia_caja: '-1500', visitas: '2' },
        { id_maquina: '8', nombre: 'B', dinero_retirado: '9000', venta_estimada: '8500', diferencia_caja: '500', visitas: '2' },
      ] })
      .mockResolvedValueOnce({ rows: [{ activos: '2', inactivos: '1', productos_sin_proveedor: '4' }] })
      .mockResolvedValueOnce({ rows: [
        { id_proveedor: '1', nombre: 'A', productos: '5', unidades_vendidas: '3', venta_estimada: '100.50',
          costo_estimado: '150.75', margen_estimado: '-50.25', productos_costo_cero: '0' },
        { id_proveedor: '2', nombre: 'B', productos: '2', unidades_vendidas: '2', venta_estimada: '200',
          costo_estimado: '0', margen_estimado: '200', productos_costo_cero: '1' },
        { id_proveedor: '3', nombre: 'C', productos: '1', unidades_vendidas: '0', venta_estimada: '0',
          costo_estimado: '0', margen_estimado: '0', productos_costo_cero: '0' },
        { id_proveedor: null, nombre: 'Sin proveedor', productos: '4', unidades_vendidas: '1', venta_estimada: '50',
          costo_estimado: '0', margen_estimado: '50', productos_costo_cero: '1' },
      ] });

    const response = await request(app).get('/api/dashboard').query(periodo);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success', data: {
      ...emptyDashboard,
      indicadores: { dinero_retirado: 9000, venta_estimada: 10000, diferencia_caja: -1000, visitas: 4 },
      evolucion: [
        { fecha: '2026-09-01', dinero_retirado: 9000, venta_estimada: 10000, visitas: 3 },
        { fecha: '2026-09-30', dinero_retirado: 0, venta_estimada: 0, visitas: 1 },
      ],
      diferencias_maquinas: [
        { id_maquina: 7, nombre: 'A', dinero_retirado: 0, venta_estimada: 1500, diferencia_caja: -1500, visitas: 2 },
        { id_maquina: 8, nombre: 'B', dinero_retirado: 9000, venta_estimada: 8500, diferencia_caja: 500, visitas: 2 },
      ],
      proveedores: {
        activos: 2, inactivos: 1, productos_sin_proveedor: 4,
        venta_estimada: 350.5, costo_estimado: 150.75, margen_estimado: 199.75, productos_costo_cero: 2,
        detalle: [
          { id_proveedor: 1, nombre: 'A', productos: 5, unidades_vendidas: 3, venta_estimada: 100.5,
            costo_estimado: 150.75, margen_estimado: -50.25, productos_costo_cero: 0 },
          { id_proveedor: 2, nombre: 'B', productos: 2, unidades_vendidas: 2, venta_estimada: 200,
            costo_estimado: 0, margen_estimado: 200, productos_costo_cero: 1 },
          { id_proveedor: 3, nombre: 'C', productos: 1, unidades_vendidas: 0, venta_estimada: 0,
            costo_estimado: 0, margen_estimado: 0, productos_costo_cero: 0 },
          { id_proveedor: null, nombre: 'Sin proveedor', productos: 4, unidades_vendidas: 1, venta_estimada: 50,
            costo_estimado: 0, margen_estimado: 50, productos_costo_cero: 1 },
        ],
      },
    } });
  });

  it.each([
    { venta: '0', costo: '0', margen: '0' },
    { venta: '50', costo: '100', margen: '-50' },
  ])('preserves static catalog and signed supplier totals without falling back to header sales: %j', async ({ venta, costo, margen }) => {
    const defaultQuery = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('AS diferencia_caja') && !sql.includes('JOIN')) {
        return { rows: [{ dinero_retirado: '500', venta_estimada: '800', diferencia_caja: '-300', visitas: '1' }] };
      }
      if (sql.includes('AS activos')) {
        return { rows: [{ activos: '1', inactivos: '0', productos_sin_proveedor: '0' }] };
      }
      if (sql.includes('WITH catalogo')) {
        return { rows: [{ id_proveedor: '1', nombre: 'Proveedor', productos: '10', unidades_vendidas: venta === '0' ? '0' : '1',
          venta_estimada: venta, costo_estimado: costo, margen_estimado: margen, productos_costo_cero: '0' }] };
      }
      return defaultQuery(sql);
    });
    const dashboard = await getDashboard(periodo.desde, periodo.hasta);
    expect(dashboard.indicadores.venta_estimada).toBe(800);
    expect(dashboard.proveedores).toEqual({
      activos: 1, inactivos: 0, productos_sin_proveedor: 0,
      venta_estimada: Number(venta), costo_estimado: Number(costo), margen_estimado: Number(margen), productos_costo_cero: 0,
      detalle: [{ id_proveedor: 1, nombre: 'Proveedor', productos: 10, unidades_vendidas: venta === '0' ? 0 : 1,
        venta_estimada: Number(venta), costo_estimado: Number(costo), margen_estimado: Number(margen), productos_costo_cero: 0 }],
    });
  });

  it('groups only visited calendar days and all period machines without duplicating headers', async () => {
    await getDashboard(periodo.desde, periodo.hasta);
    const evolucion = query.mock.calls[4][0] as string;
    const diferencias = query.mock.calls[5][0] as string;
    for (const sql of [evolucion, diferencias]) {
      expect(sql).toContain("r.fecha_creacion >= ($1::date::timestamp AT TIME ZONE 'America/Santiago')");
      expect(sql).toContain("r.fecha_creacion < (($2::date + 1)::timestamp AT TIME ZONE 'America/Santiago')");
      expect(sql).toContain('SUM(r.dinero_retirado)');
      expect(sql).toContain('SUM(r.venta_esperada)');
      expect(sql).toContain('COUNT(*) AS visitas');
      expect(sql).not.toMatch(/reposicion_detalles|generate_series|LIMIT|m.estado/);
    }
    expect(evolucion).toContain("to_char(r.fecha_creacion AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')");
    expect(evolucion).toContain('GROUP BY 1 ORDER BY fecha ASC');
    expect(evolucion).not.toContain('JOIN');
    expect(diferencias).toContain('GROUP BY m.id_maquina, m.nombre');
    expect(diferencias).toContain('ORDER BY ABS(COALESCE(SUM(r.diferencia_dinero), 0)) DESC');
    expect(query.mock.calls[4][1]).toEqual([periodo.desde, periodo.hasta]);
    expect(query.mock.calls[5][1]).toEqual([periodo.desde, periodo.hasta]);
  });

  it('separates static catalog counts from current supplier and cost attribution of captured detail sales', async () => {
    await getDashboard(periodo.desde, periodo.hasta);
    const resumen = query.mock.calls[6][0] as string;
    const detalle = query.mock.calls[7][0] as string;
    expect(resumen).toContain('COUNT(*) FILTER (WHERE estado = true) AS activos');
    expect(resumen).toContain('COUNT(*) FILTER (WHERE estado = false) AS inactivos');
    expect(resumen).toContain('SELECT COUNT(*) FROM productos WHERE id_proveedor IS NULL');
    expect(resumen).not.toMatch(/JOIN|\$1|\$2/);
    expect(detalle).toContain('SELECT id_proveedor, COUNT(*) AS productos FROM productos GROUP BY id_proveedor');
    expect(detalle).toContain('SUM(d.cantidad_vendida)');
    expect(detalle).toContain('SUM(d.venta_esperada)');
    expect(detalle).toContain('SUM(d.cantidad_vendida * p.costo_compra)');
    expect(detalle).toContain('JOIN reposicion_detalles d ON d.id_reposicion = r.id_reposicion');
    expect(detalle).toContain('JOIN maquina_productos mp ON mp.id_maquina_producto = d.id_maquina_producto');
    expect(detalle).toContain('JOIN productos p ON p.id_producto = mp.id_producto');
    expect(detalle).toContain('COUNT(DISTINCT p.id_producto) FILTER (');
    expect(detalle).toContain('WHERE d.cantidad_vendida > 0 AND p.costo_compra = 0');
    expect(detalle).toContain('GROUP BY p.id_proveedor');
    expect(detalle).toContain("SELECT NULL::integer, 'Sin proveedor', c.productos");
    expect(detalle).toContain('FROM catalogo c WHERE c.id_proveedor IS NULL');
    expect(detalle).toContain('LEFT JOIN ventas v ON v.id_proveedor IS NOT DISTINCT FROM c.id_proveedor');
    expect(detalle).toContain("r.fecha_creacion >= ($1::date::timestamp AT TIME ZONE 'America/Santiago')");
    expect(detalle).toContain("r.fecha_creacion < (($2::date + 1)::timestamp AT TIME ZONE 'America/Santiago')");
    expect(detalle).not.toMatch(/r.dinero_retirado|r.venta_esperada|precio_venta|p.estado|pr.estado|mp.estado/);
    expect(query.mock.calls[7][1]).toEqual([periodo.desde, periodo.hasta]);
  });

  it('uses inclusive Santiago calendar bounds, header-only totals and unfiltered visit counts', async () => {
    await getDashboard(periodo.desde, periodo.hasta);
    const [indicadores, , , visitas] = query.mock.calls.map(([sql]) => sql as string);
    for (const sql of [indicadores!, visitas!]) {
      expect(sql).toContain("r.fecha_creacion >= ($1::date::timestamp AT TIME ZONE 'America/Santiago')");
      expect(sql).toContain("r.fecha_creacion < (($2::date + 1)::timestamp AT TIME ZONE 'America/Santiago')");
    }
    expect(indicadores).toContain('SUM(r.venta_esperada)');
    expect(indicadores).toContain('SUM(r.diferencia_dinero)');
    expect(indicadores).toContain('COUNT(*) AS visitas');
    expect(indicadores).not.toMatch(/JOIN|reposicion_detalles|cantidad_repuesta/);
    expect(visitas).toContain('ORDER BY r.fecha_creacion DESC, r.id_reposicion DESC LIMIT 10');
    expect(visitas).toContain('SUM(d.cantidad_repuesta)');
    expect(visitas).toContain('WHERE d.id_reposicion = r.id_reposicion');
    expect(visitas).toContain('LEFT JOIN usuarios u ON u.id_usuario = r.id_repartidor');
    expect(visitas).not.toMatch(/cantidad_repuesta\s*>|m.estado\s*=/);
  });

  it('queries active stock alerts and global last visits, ordered by severity and name', async () => {
    await getDashboard(periodo.desde, periodo.hasta);
    const sql = query.mock.calls[2][0] as string;
    expect(sql).toContain("m.estado = 'ACTIVA'");
    expect(sql).toContain('mp.estado = true');
    expect(sql).toContain('p.estado = true');
    expect(sql).toContain('WHERE mp.stock_actual = 0');
    expect(sql).toContain('mp.stock_actual > 0 AND mp.capacidad_maxima > 0');
    expect(sql).toContain('mp.stock_actual <= mp.capacidad_maxima * 0.2');
    expect(sql).toContain('WHERE a.agotados > 0 OR a.bajos > 0');
    expect(sql).toContain('ORDER BY a.agotados DESC, a.bajos DESC, a.nombre ASC');
    expect(sql).toContain('MAX(r.fecha_creacion)');
    expect(sql).not.toMatch(/\$1|\$2/);
    expect(query.mock.calls[1][0]).toContain("estado = 'MANTENCION'");
  });

  it('returns prior period totals and product ranking without repricing historical sales', async () => {
    const defaultQuery = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('$1::date - ($2::date - $1::date + 1)')) return { rows: [
        { dinero_retirado: '1200', venta_estimada: '1500', diferencia_caja: '-300', visitas: '2' },
      ] };
      if (sql.includes('GROUP BY p.id_producto, p.nombre')) return { rows: [
        { id_producto: '5', nombre: 'Agua', unidades_vendidas: '12', venta_estimada: '8400' },
      ] };
      return defaultQuery(sql);
    });
    const data = await getDashboard(periodo.desde, periodo.hasta);
    expect(data.anterior).toEqual({ dinero_retirado: 1200, venta_estimada: 1500, diferencia_caja: -300, visitas: 2 });
    expect(data.productos).toEqual([{ id_producto: 5, nombre: 'Agua', unidades_vendidas: 12, venta_estimada: 8400 }]);
    const [previousSql, previousParams] = query.mock.calls[8];
    expect(previousParams).toEqual([periodo.desde, periodo.hasta]);
    expect(previousSql).toContain("AND r.fecha_creacion < ($1::date::timestamp AT TIME ZONE 'America/Santiago')");
    const [productsSql, productsParams] = query.mock.calls[9];
    expect(productsParams).toEqual([periodo.desde, periodo.hasta]);
    expect(productsSql).toContain('SUM(d.venta_esperada)');
    expect(productsSql).toContain('HAVING SUM(d.cantidad_vendida) > 0');
    expect(productsSql).toContain('ORDER BY unidades_vendidas DESC, venta_estimada DESC, p.id_producto ASC LIMIT 5');
    expect(productsSql).not.toMatch(/precio_venta|r.dinero_retirado|p.estado/);
  });

  it('validates service inputs and propagates DB errors through the middleware', async () => {
    await expect(getDashboard(null, periodo.hasta)).rejects.toMatchObject({ statusCode: 400 });
    expect(query).not.toHaveBeenCalled();
    query.mockRejectedValue(new Error('Database unavailable'));
    expect((await request(app).get('/api/dashboard').query(periodo)).status).toBe(500);
  });
});
