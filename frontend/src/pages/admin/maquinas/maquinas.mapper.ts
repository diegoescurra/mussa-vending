import type { CreateMaquinaDTO, Maquina } from '../../../services/maquinas.service';

export type MaquinaForm = CreateMaquinaDTO;

export const emptyMaquinaForm: MaquinaForm = {
  codigo: '',
  nombre: '',
  modelo: '',
  sistemas_pago: [],
  descripcion: '',
  ubicacion: '',
  estado: 'ACTIVA',
};

export const maquinaToForm = (maquina: Maquina): MaquinaForm => ({
  codigo: maquina.codigo,
  nombre: maquina.nombre,
  modelo: maquina.modelo,
  sistemas_pago: [...maquina.sistemas_pago],
  descripcion: maquina.descripcion,
  ubicacion: maquina.ubicacion,
  estado: maquina.estado,
});
