import { api } from './api';

export type Dashboard = {
  periodo: { desde: string; hasta: string };
  indicadores: {
    dinero_retirado: number;
    venta_estimada: number;
    diferencia_caja: number;
    visitas: number;
  };
  maquinas: { activas: number; inactivas: number; mantencion: number };
  stock: { agotados: number; bajos: number };
  evolucion: Array<{
    fecha: string;
    dinero_retirado: number;
    venta_estimada: number;
    visitas: number;
  }>;
  diferencias_maquinas: Array<{
    id_maquina: number;
    nombre: string;
    dinero_retirado: number;
    venta_estimada: number;
    diferencia_caja: number;
    visitas: number;
  }>;
  proveedores: {
    activos: number;
    inactivos: number;
    productos_sin_proveedor: number;
    venta_estimada: number;
    costo_estimado: number;
    margen_estimado: number;
    productos_costo_cero: number;
    detalle: Array<{
      id_proveedor: number | null;
      nombre: string;
      productos: number;
      unidades_vendidas: number;
      venta_estimada: number;
      costo_estimado: number;
      margen_estimado: number;
      productos_costo_cero: number;
    }>;
  };
  atencion: Array<{
    id_maquina: number;
    nombre: string;
    ubicacion: string;
    agotados: number;
    bajos: number;
    ultima_visita: string | null;
  }>;
  ultimas_visitas: Array<{
    id_reposicion: number;
    fecha: string;
    maquina: string;
    responsable: string | null;
    unidades_repuestas: number;
    dinero_retirado: number;
  }>;
};

export const dashboardService = {
  get: (desde: string, hasta: string) => {
    const params = new URLSearchParams({ desde, hasta });
    return api.get<Dashboard>(`/dashboard?${params}`);
  },
};
