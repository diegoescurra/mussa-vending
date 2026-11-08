import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { bodegaService, type CreateBodegaMovimientoPayload } from '../../../services/bodega.service';

const emptyForm = { id_producto: '', tipo: 'ENTRADA' as CreateBodegaMovimientoPayload['tipo'], cantidad: '', observacion: '' };

export type MovimientoBodegaForm = typeof emptyForm;

export const useBodega = () => {
  const queryClient = useQueryClient();
  const inventario = useQuery({ queryKey: ['bodega'], queryFn: bodegaService.getInventario });
  const movimientos = useInfiniteQuery({
    queryKey: ['bodega-movimientos'],
    queryFn: ({ pageParam }) => bodegaService.getMovimientos(pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const movimientoRows = useMemo(() => movimientos.data?.pages.flatMap((page) => page.items) ?? [], [movimientos.data]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEntregaOpen, setIsEntregaOpen] = useState(false);
  const [isConteoOpen, setIsConteoOpen] = useState(false);
  const [entregaSuccess, setEntregaSuccess] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const saveMutation = useMutation({
    mutationFn: bodegaService.createMovimiento,
    onSuccess: async () => {
      setIsModalOpen(false);
      setForm(emptyForm);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bodega'] }),
        queryClient.invalidateQueries({ queryKey: ['bodega-movimientos'] }),
      ]);
    },
  });

  const openModal = () => {
    saveMutation.reset();
    setFormError('');
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!saveMutation.isPending) setIsModalOpen(false);
  };

  const selectedProduct = inventario.data?.find((producto) => producto.id_producto === Number(form.id_producto));

  const submitForm = () => {
    if (saveMutation.isPending) return;
    setFormError('');
    const cantidad = Number(form.cantidad);
    if (!selectedProduct || !Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 2147483647) {
      setFormError('Selecciona un producto e ingresa una cantidad entera mayor que cero.');
      return;
    }
    if (form.tipo === 'SALIDA' && cantidad > selectedProduct.stock_actual) {
      setFormError(`Stock insuficiente. Hay ${selectedProduct.stock_actual} unidades disponibles.`);
      return;
    }
    saveMutation.mutate({
      id_producto: selectedProduct.id_producto,
      tipo: form.tipo,
      cantidad,
      observacion: form.observacion.trim() || undefined,
    });
  };

  return {
    inventario, movimientos, movimientoRows, isModalOpen, isEntregaOpen, setIsEntregaOpen,
    isConteoOpen, setIsConteoOpen, entregaSuccess, setEntregaSuccess,
    form, setForm, formError, saveMutation, openModal, closeModal, selectedProduct, submitForm,
  };
};
