import type { EstadoMaquina, SistemaPago } from './type.maquina.js';

export type CreateMaquinaDTO = {
    codigo: string;
    nombre: string;
    descripcion: string;
    ubicacion: string;
    estado: EstadoMaquina;
    modelo: string;
    sistemas_pago: SistemaPago[];
}

export type UpdateMaquinaDTO = CreateMaquinaDTO;
