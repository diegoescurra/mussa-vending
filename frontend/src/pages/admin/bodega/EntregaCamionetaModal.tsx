import { useSession } from '@/hooks/useSession';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { FormActions } from '../../../components/forms/FormActions';
import { NumberField } from '../../../components/forms/NumberField';
import { SelectField } from '../../../components/forms/SelectField';
import { TextField } from '../../../components/forms/TextField';
import { Modal } from '../../../components/Modal';
import { StateMessage } from '../../../components/StateMessage';
import type { BodegaProducto } from '../../../services/bodega.service';
import { camionetasService, type CreateCamionetaCargaPayload } from '../../../services/camionetas.service';

type Props = {
  inventario: BodegaProducto[] | undefined;
  inventarioReady: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const EntregaCamionetaModal = ({ inventario, inventarioReady, onClose, onSuccess }: Props) => {
  const queryClient = useQueryClient();
  const camionetas = useQuery({ queryKey: ['camionetas'], queryFn: camionetasService.getAll });
  const [form, setForm] = useState({
    id_camioneta: '',
    id_producto: '',
    cantidad: '',
    observacion: '',
  });
  const [formError, setFormError] = useState('');
  const mutationLock = useRef(false);
  const id = Number(form.id_camioneta);
  const truckInventory = useQuery({
    queryKey: ['camioneta-inventario', id],
    queryFn: () => camionetasService.getInventario(id),
    enabled: id > 0,
  });
  const availableTrucks = (camionetas.data ?? []).filter(
    (truck) => truck.estado && truck.repartidor_activo,
  );
  const truck = availableTrucks.find((item) => item.id_camioneta === id);
  const bodeguero = useSession().data?.user;
  const product = inventario?.find((item) => item.estado && item.id_producto === Number(form.id_producto));
  const truckProduct = truckInventory.data?.find((item) => item.id_producto === product?.id_producto);
  const cantidad = Number(form.cantidad);
  const dataReady =
    inventarioReady &&
    camionetas.isSuccess &&
    !camionetas.isFetching &&
    truckInventory.isSuccess &&
    !truckInventory.isFetching;
  const canSave =
    dataReady &&
    !!bodeguero &&
    !!truck &&
    !!product &&
    !!truckProduct &&
    Number.isInteger(product.stock_actual) &&
    product.stock_actual >= 0 &&
    Number.isInteger(truckProduct.stock_actual) &&
    truckProduct.stock_actual >= 0 &&
    Number.isInteger(cantidad) &&
    cantidad > 0 &&
    cantidad <= 2147483647 &&
    cantidad <= product.stock_actual;

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateCamionetaCargaPayload }) =>
      camionetasService.createCarga(id, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['camioneta-inventario', variables.id] }),
        queryClient.invalidateQueries({ queryKey: ['camioneta-movimientos', variables.id] }),
        queryClient.invalidateQueries({ queryKey: ['bodega'] }),
        queryClient.invalidateQueries({ queryKey: ['bodega-movimientos'] }),
      ]);
      onSuccess();
    },
    onSettled: () => {
      mutationLock.current = false;
    },
  });
  const closeModal = () => {
    if (!mutationLock.current && !saveMutation.isPending) onClose();
  };
  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutationLock.current || saveMutation.isPending) return;
    if (!canSave || !bodeguero || !truck || !product) {
      setFormError(
        'Verifica los datos cargados y selecciona una camioneta con REPONEDOR activo y una cantidad entera positiva dentro del stock disponible.',
      );
      return;
    }
    setFormError('');
    mutationLock.current = true;
    saveMutation.mutate({
      id: truck.id_camioneta,
      payload: {
        id_bodeguero: bodeguero.id_usuario,
        id_producto: product.id_producto,
        cantidad,
        observacion: form.observacion.trim() || undefined,
      },
    });
  };

  return (
    <Modal
      title="Entregar a camioneta"
      description="Entrega un producto desde la bodega central al repartidor asignado."
      onClose={closeModal}
    >
      {camionetas.isLoading ? (
        <StateMessage title="Cargando datos" description="Obteniendo camionetas y repartidores asignados." />
      ) : null}
      {camionetas.isError ? (
        <StateMessage
          title="No se puede registrar la entrega"
          description={
            camionetas.error?.message ||
            'No se pudieron cargar los datos requeridos.'
          }
        />
      ) : null}
      {camionetas.isSuccess && !availableTrucks.length ? (
        <p role="status" className="mb-4 text-sm text-amber-700">
          No hay camionetas activas con un REPONEDOR activo asignado.
        </p>
      ) : null}
      {!inventarioReady ? (
        <p role="alert" className="mb-4 text-sm text-amber-700">
          El inventario central debe cargarse correctamente antes de guardar.
        </p>
      ) : null}
      <form onSubmit={submitForm}>
        <fieldset disabled={saveMutation.isPending} className="grid gap-4 sm:grid-cols-2">
          <p className="text-sm text-slate-600 sm:col-span-2">
            Bodeguero: {bodeguero?.nombre} {bodeguero?.apellido}
          </p>
          <SelectField
            label="Camioneta"
            required
            value={form.id_camioneta}
            placeholder="Selecciona una camioneta"
            options={availableTrucks.map((item) => ({
              value: item.id_camioneta,
              label: `${item.nombre} (${item.patente})`,
            }))}
            onChange={(id_camioneta) => setForm({ ...form, id_camioneta })}
          />
          <p className="text-sm text-slate-600 sm:col-span-2">
            Reponedor asignado:{' '}
            {truck
              ? `${truck.repartidor_nombre} ${truck.repartidor_apellido}`.trim()
              : 'Selecciona una camioneta con asignacion activa.'}
          </p>
          <SelectField
            label="Producto"
            required
            value={form.id_producto}
            placeholder="Selecciona un producto"
            options={(inventario ?? [])
              .filter((item) => item.estado)
              .map((item) => ({ value: item.id_producto, label: item.producto_nombre }))}
            onChange={(id_producto) => setForm({ ...form, id_producto })}
          />
          <NumberField
            label="Cantidad aprobada"
            required
            value={form.cantidad}
            onChange={(cantidad) => setForm({ ...form, cantidad })}
          />
          {product ? (
            <p className="text-sm text-slate-600 sm:col-span-2">
              Stock disponible en bodega central: {product.stock_actual} unidades.
            </p>
          ) : null}
          {id > 0 && truckInventory.isFetching ? (
            <p role="status" className="text-sm text-slate-600 sm:col-span-2">
              Consultando stock de la camioneta...
            </p>
          ) : null}
          {truckInventory.isError ? (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              No se pudo consultar el inventario de la camioneta: {truckInventory.error.message}
            </p>
          ) : null}
          {product && id > 0 && truckInventory.isSuccess && !truckInventory.isFetching ? (
            <p className="text-sm text-slate-600 sm:col-span-2">
              Stock actual en camioneta:{' '}
              {truckProduct
                ? `${truckProduct.stock_actual} unidades.`
                : 'Producto ausente del inventario. No se puede guardar.'}
            </p>
          ) : null}
          <TextField
            label="Observacion (opcional)"
            value={form.observacion}
            onChange={(observacion) => setForm({ ...form, observacion })}
            rows={2}
            className="sm:col-span-2"
          />
          {formError || saveMutation.isError ? (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              {formError || saveMutation.error?.message}
            </p>
          ) : null}
          <FormActions
            submitLabel={saveMutation.isPending ? 'Entregando...' : 'Confirmar entrega'}
            isSubmitting={saveMutation.isPending || !canSave}
            onCancel={closeModal}
          />
        </fieldset>
      </form>
    </Modal>
  );
};
