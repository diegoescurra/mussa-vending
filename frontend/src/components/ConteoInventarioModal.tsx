import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { conteosService } from '../services/conteos.service';
import { usuariosService } from '../services/usuarios.service';
import type { Camioneta, CamionetaProducto } from '../services/camionetas.service';
import { Modal } from './Modal';
import { StateMessage } from './StateMessage';
import { FormActions } from './forms/FormActions';
import { NumberField } from './forms/NumberField';
import { SelectField } from './forms/SelectField';
import { TextField } from './forms/TextField';

type Props = {
  inventario: CamionetaProducto[] | undefined;
  inventarioReady: boolean;
  camioneta?: Camioneta;
  onClose: () => void;
};

export const ConteoInventarioModal = ({ inventario, inventarioReady, camioneta, onClose }: Props) => {
  const queryClient = useQueryClient();
  const usuarios = useQuery({ queryKey: ['usuarios'], queryFn: usuariosService.getAll, retry: false });
  const [form, setForm] = useState({ id_responsable: '', id_producto: '', stock_fisico: '', observacion: '' });
  const [formError, setFormError] = useState('');
  const mutationLock = useRef(false);
  const responsables = (usuarios.data ?? []).filter((user) => user.estado
    && (user.rol === 'ADMIN' || (camioneta && user.rol === 'REPONEDOR' && user.id_usuario === camioneta.id_repartidor)));
  const responsable = responsables.find((user) => user.id_usuario === Number(form.id_responsable));
  const producto = inventario?.find((item) => item.id_producto === Number(form.id_producto));
  const fisico = Number(form.stock_fisico);
  const validFisico = form.stock_fisico.trim() !== '' && Number.isInteger(fisico) && fisico >= 0 && fisico <= 2147483647;
  const dataReady = inventarioReady && usuarios.isSuccess && !usuarios.isFetching;
  const canSave = dataReady && !!responsable && !!producto && validFisico;
  const diferencia = producto && validFisico ? fisico - producto.stock_actual : undefined;
  const saveMutation = useMutation({
    mutationFn: conteosService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['conteos', camioneta?.id_camioneta ?? 'central'] });
      onClose();
    },
    onSettled: () => { mutationLock.current = false; },
  });
  const closeModal = () => {
    if (!mutationLock.current && !saveMutation.isPending) onClose();
  };
  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutationLock.current || saveMutation.isPending) return;
    if (!canSave || !responsable || !producto) {
      setFormError('Verifica los datos cargados, el responsable, el producto y un stock fisico entero entre 0 y 2147483647.');
      return;
    }
    setFormError('');
    mutationLock.current = true;
    saveMutation.mutate({
      id_responsable: responsable.id_usuario,
      id_producto: producto.id_producto,
      stock_fisico: fisico,
      id_camioneta: camioneta?.id_camioneta,
      observacion: form.observacion.trim() || undefined,
    });
  };

  return (
    <Modal title="Registrar conteo fisico" description={camioneta ? `Auditoria de ${camioneta.nombre}.` : 'Auditoria de bodega central.'} onClose={closeModal}>
      <p className="mb-4 rounded-2xl bg-blue-50 p-3 text-sm text-blue-800">Solo registra la diferencia y su historial. No ajusta stock automaticamente ni crea movimientos.</p>
      {usuarios.isLoading ? <StateMessage title="Cargando responsables" description="Obteniendo usuarios activos." /> : null}
      {usuarios.isError ? <StateMessage title="No se pueden cargar responsables" description={usuarios.error.message} /> : null}
      {!inventarioReady ? <p role="alert" className="mb-4 text-sm text-amber-700">El inventario y la camioneta deben cargarse correctamente antes de guardar.</p> : null}
      {usuarios.isSuccess && !responsables.length ? <p role="alert" className="mb-4 text-sm text-amber-700">No hay responsables activos con el rol requerido.</p> : null}
      <form onSubmit={submitForm}>
        <fieldset disabled={saveMutation.isPending} className="grid gap-4 sm:grid-cols-2">
          <SelectField label={camioneta ? 'Responsable (ADMIN o REPONEDOR asignado)' : 'Responsable (ADMIN)'} required value={form.id_responsable} placeholder="Selecciona un responsable" options={responsables.map((user) => ({ value: user.id_usuario, label: `${user.nombre} ${user.apellido} (${user.rol})`.trim() }))} onChange={(id_responsable) => setForm({ ...form, id_responsable })} className="sm:col-span-2" />
          <SelectField label="Producto" required value={form.id_producto} placeholder="Selecciona un producto" options={(inventario ?? []).map((item) => ({ value: item.id_producto, label: `${item.producto_nombre}${item.estado ? '' : ' (inactivo)'}` }))} onChange={(id_producto) => setForm({ ...form, id_producto })} />
          <NumberField label="Stock fisico" required value={form.stock_fisico} onChange={(stock_fisico) => setForm({ ...form, stock_fisico })} />
          {producto ? <p className="text-sm text-slate-600 sm:col-span-2">Esperado: {producto.stock_actual} unidades. Fisico: {validFisico ? fisico : '-'}.</p> : null}
          {diferencia !== undefined ? <p role="status" className="text-sm font-semibold text-slate-800 sm:col-span-2">Diferencia: {diferencia > 0 ? '+' : ''}{diferencia} ({diferencia < 0 ? 'Faltante' : diferencia > 0 ? 'Sobrante' : 'Coincide'}).</p> : null}
          <p className="text-xs text-slate-500 sm:col-span-2">El esperado definitivo se captura en el servidor al guardar y puede variar respecto de esta vista.</p>
          <TextField label="Observacion (opcional)" value={form.observacion} onChange={(observacion) => setForm({ ...form, observacion })} rows={2} className="sm:col-span-2" />
          {formError || saveMutation.isError ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{formError || saveMutation.error?.message}</p> : null}
          <FormActions submitLabel={saveMutation.isPending ? 'Guardando...' : 'Guardar conteo'} isSubmitting={saveMutation.isPending || !canSave} onCancel={closeModal} />
        </fieldset>
      </form>
    </Modal>
  );
};
