export type EstadoMaquina = 'ACTIVA' | 'INACTIVA' | 'MANTENCION';
export type SistemaPago = 'MONEDA' | 'BILLETE' | 'TARJETA';

export type Maquina = {
    id_maquina: number;
    codigo: string;
    nombre: string;
    descripcion: string;
    ubicacion: string;
    estado: EstadoMaquina;
    modelo: string;
    sistemas_pago: SistemaPago[];
    fecha_creacion: Date;
}

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
