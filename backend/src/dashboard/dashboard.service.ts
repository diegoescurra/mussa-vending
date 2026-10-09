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

  const [indicadoresResult, maquinasResult, atencionResult, visitasResult,
    evolucionResult, diferenciasResult, proveedoresResult, detalleResult] = await Promise.all([
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
    pool.query(
      `SELECT to_char(r.fecha_creacion AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS fecha,
         COALESCE(SUM(r.dinero_retirado), 0) AS dinero_retirado,
         COALESCE(SUM(r.venta_esperada), 0) AS venta_estimada, COUNT(*) AS visitas
       FROM reposiciones r WHERE ${periodoWhere}
       GROUP BY 1 ORDER BY fecha ASC`,
      [desde, hasta],
    ),
    pool.query(
      `SELECT m.id_maquina, m.nombre,
         COALESCE(SUM(r.dinero_retirado), 0) AS dinero_retirado,
         COALESCE(SUM(r.venta_esperada), 0) AS venta_estimada,
         COALESCE(SUM(r.diferencia_dinero), 0) AS diferencia_caja, COUNT(*) AS visitas
       FROM reposiciones r JOIN maquinas m ON m.id_maquina = r.id_maquina
       WHERE ${periodoWhere}
       GROUP BY m.id_maquina, m.nombre
       ORDER BY ABS(COALESCE(SUM(r.diferencia_dinero), 0)) DESC, m.nombre ASC, m.id_maquina ASC`,
      [desde, hasta],
    ),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE estado = true) AS activos,
         COUNT(*) FILTER (WHERE estado = false) AS inactivos,
         (SELECT COUNT(*) FROM productos WHERE id_proveedor IS NULL) AS productos_sin_proveedor
       FROM proveedores`,
    ),
    pool.query(
      // Catalog counts and period sales are grouped independently to avoid multiplying either.
      // Missing historical details contribute nothing; header cash is never attributed to suppliers.
      `WITH catalogo AS (
         SELECT id_proveedor, COUNT(*) AS productos FROM productos GROUP BY id_proveedor
       ), ventas AS (
         SELECT p.id_proveedor, SUM(d.cantidad_vendida) AS unidades_vendidas,
           SUM(d.venta_esperada) AS venta_estimada,
           SUM(d.cantidad_vendida * p.costo_compra) AS costo_estimado,
           COUNT(DISTINCT p.id_producto) FILTER (
             WHERE d.cantidad_vendida > 0 AND p.costo_compra = 0) AS productos_costo_cero
         FROM reposiciones r
         JOIN reposicion_detalles d ON d.id_reposicion = r.id_reposicion
         JOIN maquina_productos mp ON mp.id_maquina_producto = d.id_maquina_producto
         JOIN productos p ON p.id_producto = mp.id_producto
         WHERE ${periodoWhere}
         GROUP BY p.id_proveedor
       ), categorias AS (
         SELECT pr.id_proveedor, pr.nombre, c.productos
         FROM catalogo c JOIN proveedores pr ON pr.id_proveedor = c.id_proveedor
         UNION ALL
         SELECT NULL::integer, 'Sin proveedor', c.productos
         FROM catalogo c WHERE c.id_proveedor IS NULL
       )
       SELECT c.id_proveedor, c.nombre, c.productos,
         COALESCE(v.unidades_vendidas, 0) AS unidades_vendidas,
         COALESCE(v.venta_estimada, 0) AS venta_estimada,
         COALESCE(v.costo_estimado, 0) AS costo_estimado,
         COALESCE(v.venta_estimada, 0) - COALESCE(v.costo_estimado, 0) AS margen_estimado,
         COALESCE(v.productos_costo_cero, 0) AS productos_costo_cero
       FROM categorias c LEFT JOIN ventas v ON v.id_proveedor IS NOT DISTINCT FROM c.id_proveedor
       ORDER BY c.nombre ASC, c.id_proveedor ASC NULLS LAST`,
      [desde, hasta],
    ),
  ]);

  const indicadores = indicadoresResult.rows[0];
  const maquinas = maquinasResult.rows[0];
  const proveedores = proveedoresResult.rows[0];
  const detalle: Dashboard['proveedores']['detalle'] = detalleResult.rows.map((row) => ({
    id_proveedor: row.id_proveedor === null ? null : Number(row.id_proveedor),
    nombre: row.nombre,
    productos: Number(row.productos),
    unidades_vendidas: Number(row.unidades_vendidas),
    venta_estimada: Number(row.venta_estimada),
    costo_estimado: Number(row.costo_estimado),
    margen_estimado: Number(row.margen_estimado),
    productos_costo_cero: Number(row.productos_costo_cero),
  }));
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
    evolucion: evolucionResult.rows.map((row) => ({
      fecha: row.fecha,
      dinero_retirado: Number(row.dinero_retirado),
      venta_estimada: Number(row.venta_estimada),
      visitas: Number(row.visitas),
    })),
    diferencias_maquinas: diferenciasResult.rows.map((row) => ({
      id_maquina: Number(row.id_maquina),
      nombre: row.nombre,
      dinero_retirado: Number(row.dinero_retirado),
      venta_estimada: Number(row.venta_estimada),
      diferencia_caja: Number(row.diferencia_caja),
      visitas: Number(row.visitas),
    })),
    proveedores: {
      activos: Number(proveedores.activos),
      inactivos: Number(proveedores.inactivos),
      productos_sin_proveedor: Number(proveedores.productos_sin_proveedor),
      ...detalle.reduce((total, row) => ({
        venta_estimada: total.venta_estimada + row.venta_estimada,
        costo_estimado: total.costo_estimado + row.costo_estimado,
        margen_estimado: total.margen_estimado + row.margen_estimado,
        productos_costo_cero: total.productos_costo_cero + row.productos_costo_cero,
      }), { venta_estimada: 0, costo_estimado: 0, margen_estimado: 0, productos_costo_cero: 0 }),
      detalle,
    },
  };
};
