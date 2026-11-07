import pool from '../config/db.js';

// Each midnight is converted separately so Santiago's DST does not assume 24-hour days.
const periodoWhere = `r.fecha_creacion >= ($1::date::timestamp AT TIME ZONE 'America/Santiago')
  AND r.fecha_creacion < (($2::date + 1)::timestamp AT TIME ZONE 'America/Santiago')`;

export const findDashboardData = async (desde: string, hasta: string) => {
  const [indicadoresResult, maquinasResult, atencionResult, visitasResult,
    evolucionResult, diferenciasResult, proveedoresResult, detalleResult, anteriorResult, productosResult] = await Promise.all([
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
       SELECT a.id_maquina, a.nombre, a.ubicacion, a.agotados, a.bajos, (SELECT MAX(r.fecha_creacion) FROM reposiciones r
         WHERE r.id_maquina = a.id_maquina) AS ultima_visita
       FROM alertas a WHERE a.agotados > 0 OR a.bajos > 0
       ORDER BY a.agotados DESC, a.bajos DESC, a.nombre ASC`,
    ),
    pool.query(
      `WITH recientes AS (
         SELECT r.id_reposicion, r.id_maquina, r.id_repartidor, r.fecha_creacion, r.dinero_retirado
         FROM reposiciones r WHERE ${periodoWhere}
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
    pool.query(
      `SELECT COALESCE(SUM(r.dinero_retirado), 0) AS dinero_retirado,
         COALESCE(SUM(r.venta_esperada), 0) AS venta_estimada,
         COALESCE(SUM(r.diferencia_dinero), 0) AS diferencia_caja, COUNT(*) AS visitas
       FROM reposiciones r
       WHERE r.fecha_creacion >= (($1::date - ($2::date - $1::date + 1))::timestamp AT TIME ZONE 'America/Santiago')
         AND r.fecha_creacion < ($1::date::timestamp AT TIME ZONE 'America/Santiago')`,
      [desde, hasta],
    ),
    pool.query(
      `SELECT p.id_producto, p.nombre, SUM(d.cantidad_vendida) AS unidades_vendidas,
         SUM(d.venta_esperada) AS venta_estimada
       FROM reposiciones r
       JOIN reposicion_detalles d ON d.id_reposicion = r.id_reposicion
       JOIN maquina_productos mp ON mp.id_maquina_producto = d.id_maquina_producto
       JOIN productos p ON p.id_producto = mp.id_producto
       WHERE ${periodoWhere}
       GROUP BY p.id_producto, p.nombre HAVING SUM(d.cantidad_vendida) > 0
       ORDER BY unidades_vendidas DESC, venta_estimada DESC, p.id_producto ASC LIMIT 5`,
      [desde, hasta],
    ),
  ]);

  return {
    indicadores: indicadoresResult.rows,
    maquinas: maquinasResult.rows,
    atencion: atencionResult.rows,
    visitas: visitasResult.rows,
    evolucion: evolucionResult.rows,
    diferencias: diferenciasResult.rows,
    proveedores: proveedoresResult.rows,
    detalle: detalleResult.rows,
    anterior: anteriorResult.rows,
    productos: productosResult.rows,
  };
};
