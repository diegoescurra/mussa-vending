import pool from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import type { Dashboard } from './dashboard.type.js';

const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// Each midnight is converted separately so Santiago's DST does not assume 24-hour days.
const periodoWhere = `r.fecha_creacion >= ($1::date::timestamp AT TIME ZONE 'America/Santiago')
  AND r.fecha_creacion < (($2::date + 1)::timestamp AT TIME ZONE 'America/Santiago')`;

export const getDashboard = async (desde: unknown, hasta: unknown): Promise<Dashboard> => {
  if (!isCalendarDate(desde) || !isCalendarDate(hasta)) {
    throw new AppError('Desde y hasta deben ser fechas reales con formato YYYY-MM-DD', 400);
  }
  if (desde > hasta) throw new AppError('Desde no puede ser posterior a hasta', 400);

  const [indicadoresResult, maquinasResult, atencionResult, visitasResult] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(r.dinero_retirado), 0) AS dinero_retirado,
         COALESCE(SUM(r.venta_esperada), 0) AS venta_estimada,
         COALESCE(SUM(r.diferencia_dinero), 0) AS diferencia_caja,
         COUNT(*) AS visitas
       FROM reposiciones r WHERE ${periodoWhere}`,
      [desde, hasta],
    ),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE estado = 'ACTIVA') AS activas,
         COUNT(*) FILTER (WHERE estado = 'INACTIVA') AS inactivas,
         COUNT(*) FILTER (WHERE estado = 'MANTENCION') AS mantencion
       FROM maquinas`,
    ),
    pool.query(
      `WITH alertas AS (
         SELECT m.id_maquina, m.nombre, m.ubicacion,
           COUNT(*) FILTER (WHERE mp.stock_actual = 0) AS agotados,
           COUNT(*) FILTER (WHERE mp.stock_actual > 0 AND mp.capacidad_maxima > 0
             AND mp.stock_actual <= mp.capacidad_maxima * 0.2) AS bajos
         FROM maquinas m
         JOIN maquina_productos mp ON mp.id_maquina = m.id_maquina AND mp.estado = true
         JOIN productos p ON p.id_producto = mp.id_producto AND p.estado = true
         WHERE m.estado = 'ACTIVA'
         GROUP BY m.id_maquina, m.nombre, m.ubicacion
       )
       SELECT a.*, (SELECT MAX(r.fecha_creacion) FROM reposiciones r
         WHERE r.id_maquina = a.id_maquina) AS ultima_visita
       FROM alertas a WHERE a.agotados > 0 OR a.bajos > 0
       ORDER BY a.agotados DESC, a.bajos DESC, a.nombre ASC`,
    ),
    pool.query(
      `WITH recientes AS (
         SELECT r.* FROM reposiciones r WHERE ${periodoWhere}
         ORDER BY r.fecha_creacion DESC, r.id_reposicion DESC LIMIT 10
       )
       SELECT r.id_reposicion, r.fecha_creacion AS fecha, m.nombre AS maquina,
         CASE WHEN u.id_usuario IS NULL THEN NULL
           ELSE concat_ws(' ', u.nombre, u.apellido) END AS responsable,
         COALESCE((SELECT SUM(d.cantidad_repuesta) FROM reposicion_detalles d
           WHERE d.id_reposicion = r.id_reposicion), 0) AS unidades_repuestas,
         r.dinero_retirado
       FROM recientes r
       JOIN maquinas m ON m.id_maquina = r.id_maquina
       LEFT JOIN usuarios u ON u.id_usuario = r.id_repartidor
       ORDER BY r.fecha_creacion DESC, r.id_reposicion DESC`,
      [desde, hasta],
    ),
  ]);

  const indicadores = indicadoresResult.rows[0];
  const maquinas = maquinasResult.rows[0];
  const atencion: Dashboard['atencion'] = atencionResult.rows.map((row) => ({
    id_maquina: Number(row.id_maquina),
    nombre: row.nombre,
    ubicacion: row.ubicacion,
    agotados: Number(row.agotados),
    bajos: Number(row.bajos),
    ultima_visita: row.ultima_visita === null ? null : new Date(row.ultima_visita).toISOString(),
  }));

  return {
    periodo: { desde, hasta },
    indicadores: {
      dinero_retirado: Number(indicadores.dinero_retirado),
      venta_estimada: Number(indicadores.venta_estimada),
      diferencia_caja: Number(indicadores.diferencia_caja),
      visitas: Number(indicadores.visitas),
    },
    maquinas: {
      activas: Number(maquinas.activas),
      inactivas: Number(maquinas.inactivas),
      mantencion: Number(maquinas.mantencion),
    },
    stock: atencion.reduce((total, row) => ({
      agotados: total.agotados + row.agotados,
      bajos: total.bajos + row.bajos,
    }), { agotados: 0, bajos: 0 }),
    atencion,
    ultimas_visitas: visitasResult.rows.map((row) => ({
      id_reposicion: Number(row.id_reposicion),
      fecha: new Date(row.fecha).toISOString(),
      maquina: row.maquina,
      responsable: row.responsable,
      unidades_repuestas: Number(row.unidades_repuestas),
      dinero_retirado: Number(row.dinero_retirado),
    })),
  };
};
