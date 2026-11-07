import { findDashboardData } from './dashboard.repository.js';
import { AppError } from '../utils/AppError.js';
import type { Dashboard } from './dashboard.type.js';

const maxPeriodDays = 30;
const millisecondsPerDay = 86_400_000;

export const getDashboard = async (desde: string, hasta: string): Promise<Dashboard> => {
  if (desde > hasta) throw new AppError('Desde no puede ser posterior a hasta', 400);

  // Las fechas ISO sin hora se interpretan en UTC para contar días sin efectos del cambio de hora.
  const periodDays = (Date.parse(hasta) - Date.parse(desde)) / millisecondsPerDay + 1;
  if (periodDays > maxPeriodDays) {
    throw new AppError(`El período del dashboard no puede superar ${maxPeriodDays} días calendario, incluyendo ambas fechas`, 400);
  }

  const {
    indicadores: indicadoresRows, maquinas: maquinasRows, atencion: atencionRows, visitas: visitasRows, evolucion: evolucionRows,
    diferencias: diferenciasRows, proveedores: proveedoresRows, detalle: detalleRows, anterior: anteriorRows, productos: productosRows,
  } = await findDashboardData(desde, hasta);

  const indicadores = indicadoresRows[0];
  const maquinas = maquinasRows[0];
  const proveedores = proveedoresRows[0];
  const detalle: Dashboard['proveedores']['detalle'] = detalleRows.map((row) => ({
    id_proveedor: row.id_proveedor === null ? null : Number(row.id_proveedor),
    nombre: row.nombre,
    productos: Number(row.productos),
    unidades_vendidas: Number(row.unidades_vendidas),
    venta_estimada: Number(row.venta_estimada),
    costo_estimado: Number(row.costo_estimado),
    margen_estimado: Number(row.margen_estimado),
    productos_costo_cero: Number(row.productos_costo_cero),
  }));
  const atencion: Dashboard['atencion'] = atencionRows.map((row) => ({
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
    anterior: {
      dinero_retirado: Number(anteriorRows[0].dinero_retirado),
      venta_estimada: Number(anteriorRows[0].venta_estimada),
      diferencia_caja: Number(anteriorRows[0].diferencia_caja),
      visitas: Number(anteriorRows[0].visitas),
    },
    productos: productosRows.map((row) => ({
      id_producto: Number(row.id_producto), nombre: row.nombre,
      unidades_vendidas: Number(row.unidades_vendidas), venta_estimada: Number(row.venta_estimada),
    })),
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
    ultimas_visitas: visitasRows.map((row) => ({
      id_reposicion: Number(row.id_reposicion),
      fecha: new Date(row.fecha).toISOString(),
      maquina: row.maquina,
      responsable: row.responsable,
      unidades_repuestas: Number(row.unidades_repuestas),
      dinero_retirado: Number(row.dinero_retirado),
    })),
    evolucion: evolucionRows.map((row) => ({
      fecha: row.fecha,
      dinero_retirado: Number(row.dinero_retirado),
      venta_estimada: Number(row.venta_estimada),
      visitas: Number(row.visitas),
    })),
    diferencias_maquinas: diferenciasRows.map((row) => ({
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
