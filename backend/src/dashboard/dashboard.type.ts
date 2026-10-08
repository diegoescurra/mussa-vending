export interface Dashboard {
  periodo: { desde: string; hasta: string };
  indicadores: {
    dinero_retirado: number;
    venta_estimada: number;
    diferencia_caja: number;
    visitas: number;
  };
  maquinas: { activas: number; inactivas: number; mantencion: number };
  stock: { agotados: number; bajos: number };
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
}
