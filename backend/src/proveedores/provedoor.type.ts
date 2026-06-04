export interface Proveedor {
  id_proveedor: number;
  nombre: string;
  estado: boolean;
  fecha_creacion: Date;
}

export interface CreateProveedorDTO {
  nombre: string;
}

export interface UpdateProveedorDTO {
  nombre?: string;
  estado?: boolean;
}