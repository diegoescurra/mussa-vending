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
  maquinas: { activas: 0, inactivas: 0, mantencion: 0 },
  stock: { agotados: 0, bajos: 0 },
  atencion: [],
  ultimas_visitas: [],
};

describe('dashboard service and route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('AS dinero_retirado')) return { rows: [emptyDashboard.indicadores] };
      if (sql.includes('AS activas')) return { rows: [emptyDashboard.maquinas] };
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
    expect(query).toHaveBeenCalledTimes(4);
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

  it('validates service inputs and propagates DB errors through the middleware', async () => {
    await expect(getDashboard(null, periodo.hasta)).rejects.toMatchObject({ statusCode: 400 });
    expect(query).not.toHaveBeenCalled();
    query.mockRejectedValue(new Error('Database unavailable'));
    expect((await request(app).get('/api/dashboard').query(periodo)).status).toBe(500);
  });
});
