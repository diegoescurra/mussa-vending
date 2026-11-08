import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ApiError } from '../../services/api';
import { useInventarioMaquinas } from '../../hooks/useInventarioMaquinas';
import { useMaquinas } from '../../hooks/useMaquinas';
import { reposicionesService, type CreateReposicionPayload } from '../../services/reposiciones.service';
import { camionetasService } from '../../services/camionetas.service';
import { useSession } from '@/hooks/useSession';
import {
  buildReposicionPayload,
  calculateLines,
  calculateResumen,
  hasErrors,
  toNumber,
  type ReposicionStep,
  type ReposicionLine,
  type LineState,
} from './reposicion.calculations';

export const useReposicion = () => {
  const queryClient = useQueryClient();
  const maquinasQuery = useMaquinas();
  const inventarioQuery = useInventarioMaquinas();
  const activeReponedor = useSession().data?.user;
  const selectedReponedorId = String(activeReponedor?.id_usuario ?? '');
  const camionetasQuery = useQuery({ queryKey: ['camionetas'], queryFn: camionetasService.getAll });
  const maquinas = (maquinasQuery.data ?? []).filter((machine) => machine.estado === 'ACTIVA');
  const inventario = inventarioQuery.data ?? [];
  const [step, setStep] = useState<ReposicionStep>(1);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [reviewedProducts, setReviewedProducts] = useState<ReposicionLine[] | null>(null);
  const [lineState, setLineState] = useState<Record<number, LineState>>({});
  const [dineroRetirado, setDineroRetirado] = useState('');
  const [observacion, setObservacion] = useState('');
  const [pendingPayload, setPendingPayload] = useState<CreateReposicionPayload | null>(null);
  const submitting = useRef(false);

  const activeMachineId = selectedMachineId;
  const activeMachine = maquinas.find((machine) => String(machine.id_maquina) === activeMachineId);
  const machineProducts =
    reviewedProducts ??
    inventario.filter((item) => String(item.id_maquina) === activeMachineId && item.estado);
  const assignedTrucks = (camionetasQuery.data ?? []).filter(
    (truck) => truck.estado && truck.id_repartidor === activeReponedor?.id_usuario,
  );
  const activeTruck = assignedTrucks.length === 1 ? assignedTrucks[0] : undefined;
  const truckInventoryQuery = useQuery({
    queryKey: ['camioneta-inventario', activeTruck?.id_camioneta],
    queryFn: () => camionetasService.getInventario(activeTruck!.id_camioneta),
    enabled: Boolean(activeTruck),
  });
  // Keep zero-stock products: missing or inactive products cannot supply the machine.
  const truckStock = new Map(
    (truckInventoryQuery.data ?? []).map((item) => [
      item.id_producto,
      item.estado ? Number(item.stock_actual) : 0,
    ]),
  );
  const truckStockValid = [...truckStock.values()].every((stock) => Number.isInteger(stock) && stock >= 0);
  const baseQueries = [maquinasQuery, inventarioQuery, camionetasQuery];
  const dataReady =
    baseQueries.every((query) => query.isSuccess) &&
    truckInventoryQuery.isSuccess &&
    Boolean(activeMachine && activeReponedor && activeTruck) &&
    machineProducts.length > 0 &&
    truckStockValid;
  const dataError =
    baseQueries.find((query) => query.isError)?.error ??
    (activeTruck && truckInventoryQuery.isError ? truckInventoryQuery.error : null);
  const dataLoading =
    baseQueries.some((query) => query.isPending) || Boolean(activeTruck && truckInventoryQuery.isPending);
  const lines = calculateLines(machineProducts, lineState, truckStock);

  const setLineValue = (idMaquinaProducto: number, key: keyof LineState, value: string) => {
    setLineState((current) => ({
      ...current,
      [idMaquinaProducto]: {
        stockEncontrado: current[idMaquinaProducto]?.stockEncontrado ?? '',
        cantidadRepuesta: current[idMaquinaProducto]?.cantidadRepuesta ?? '',
        cantidadRetirada: current[idMaquinaProducto]?.cantidadRetirada ?? '0',
        [key]: value,
      },
    }));
  };

  const liveResumen = calculateResumen(machineProducts, lineState, dineroRetirado);
  const [savedResumen, setSavedResumen] = useState<typeof liveResumen | null>(null);
  const resumen = savedResumen ?? liveResumen;
  const saveMutation = useMutation({
    mutationFn: reposicionesService.create,
    onMutate: () => activeTruck?.id_camioneta,
    onError: (error) => {
      // Unknown outcomes must retry exactly the same operation, even after a refetch.
      if (error instanceof ApiError && (error.status === 400 || error.status === 409)) {
        setPendingPayload(null);
        setSavedResumen(null);
      }
    },
    onSettled: () => {
      submitting.current = false;
    },
    onSuccess: (_data, _variables, truckId) => {
      void queryClient.invalidateQueries({ queryKey: ['inventario-maquinas'] });
      void queryClient.invalidateQueries({ queryKey: ['camioneta-inventario', truckId] });
      void queryClient.invalidateQueries({ queryKey: ['camioneta-movimientos', truckId] });
    },
  });
  const locked = saveMutation.isPending || saveMutation.isSuccess;
  const hasConflict = saveMutation.error instanceof ApiError && saveMutation.error.status === 409;
  const visibleStep = !dataReady && !locked && !pendingPayload ? 1 : step;
  const foundValid = lines.every(
    ({ values, errors }) => Boolean(values?.stockEncontrado.trim()) && !errors.stockEncontrado,
  );
  const quantitiesValid =
    foundValid &&
    lines.every(({ values, errors }) => Boolean(values?.cantidadRepuesta.trim()) && !hasErrors(errors));
  const moneyValid =
    dineroRetirado.trim() !== '' &&
    Number.isFinite(toNumber(dineroRetirado)) &&
    toNumber(dineroRetirado) >= 0;
  const canFinish = !locked && (Boolean(pendingPayload) || (dataReady && quantitiesValid && moneyValid));

  const resetForm = () => {
    setPendingPayload(null);
    setStep(1);
    setReviewedProducts(null);
    setLineState({});
    setDineroRetirado('');
    setObservacion('');
    setSavedResumen(null);
    saveMutation.reset();
  };
  const reloadInventory = () => {
    resetForm();
    void inventarioQuery.refetch();
    if (activeTruck) void truckInventoryQuery.refetch();
  };
  const selectMachine = (id: string) => {
    if (locked || pendingPayload || id === selectedMachineId) return;
    resetForm();
    setSelectedMachineId(id);
  };

  const canGoNext = () => {
    if (!dataReady || locked) return false;
    if (visibleStep === 1 && (inventarioQuery.isFetching || truckInventoryQuery.isFetching)) return false;
    if (visibleStep >= 3 && !foundValid) return false;
    if (visibleStep >= 4 && !quantitiesValid) return false;
    if (visibleStep >= 5 && !moneyValid) return false;
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) return;
    if (!reviewedProducts) setReviewedProducts(machineProducts);
    setStep(Math.min(visibleStep + 1, 6) as ReposicionStep);
  };
  const goBack = () => {
    if (!locked && !pendingPayload) setStep(Math.max(visibleStep - 1, 1) as ReposicionStep);
  };

  const finishReposicion = () => {
    if (!canFinish || submitting.current) return;
    const payload =
      pendingPayload ??
      buildReposicionPayload(crypto.randomUUID(), activeMachineId, selectedReponedorId, observacion, resumen);
    submitting.current = true;
    setPendingPayload(payload);
    if (!pendingPayload) setSavedResumen(liveResumen);
    saveMutation.mutate(payload);
  };

  const newReposicion = () => {
    resetForm();
    setSelectedMachineId('');
  };

  return {
    visibleStep,
    locked,
    pendingPayload,
    canFinish,
    hasConflict,
    saveMutation,
    goBack,
    goNext,
    canGoNext,
    finishReposicion,
    reloadInventory,
    newReposicion,
    maquinas,
    maquinasQuery,
    inventarioQuery,
    camionetasQuery,
    truckInventoryQuery,
    activeReponedor,
    activeTruck,
    assignedTrucks,
    activeMachineId,
    activeMachine,
    selectMachine,
    machineProducts,
    dataLoading,
    dataError,
    truckStockValid,
    lines,
    setLineValue,
    dineroRetirado,
    setDineroRetirado,
    moneyValid,
    observacion,
    setObservacion,
    resumen,
  };
};

export type ReposicionFlow = ReturnType<typeof useReposicion>;
