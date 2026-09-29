import type { EstadoMaquina, Maquina } from '../../../services/maquinas.service';

export type MaquinaForm = {
  codigo: string;
  nombre: string;
  descripcion: string;
  ubicacion: string;
  estado: EstadoMaquina;
};

export const emptyMaquinaForm: MaquinaForm = {
  codigo: '',
  nombre: '',
  descripcion: '',
  ubicacion: '',
  estado: 'ACTIVA',
};

export const maquinaToForm = (maquina: Maquina): MaquinaForm => ({
  codigo: maquina.codigo,
  nombre: maquina.nombre,
  descripcion: maquina.descripcion,
  ubicacion: maquina.ubicacion,
  estado: maquina.estado,
});
