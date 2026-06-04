export type EstadoMaquina = 'ACTIVA' | 'INACTIVA' | 'MANTENCION';

export type Maquina = {
    id_maquina: number;
    codigo: string;
    nombre: string;
    descripcion: string;
    ubicacion: string;
    estado: EstadoMaquina;
    fecha_creacion: Date;
}

export type CreateMaquinaDTO = {
    codigo: string;
    nombre: string;
    descripcion: string;
    ubicacion: string;
    estado: EstadoMaquina;
}

export type UpdateMaquinaDTO = {
    codigo?: string;
    nombre?: string;
    descripcion?: string;
    ubicacion?: string;
    estado?: EstadoMaquina;
}
