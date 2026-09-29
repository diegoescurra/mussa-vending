import { MachineCombobox } from '../../../components/MachineCombobox';
import type { Maquina } from '../../../services/maquinas.service';

type MachineInventoryHeaderProps = {
  machines: Maquina[];
  selectedMachineId: string;
  isLoadingMachines: boolean;
  productCount: number;
  onSelectMachine: (machineId: string) => void;
};

export const MachineInventoryHeader = ({
  machines,
  selectedMachineId,
  isLoadingMachines,
  productCount,
  onSelectMachine,
}: MachineInventoryHeaderProps) => {
  const activeMachine = machines.find((maquina) => String(maquina.id_maquina) === selectedMachineId);

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <MachineCombobox machines={machines} selectedMachineId={selectedMachineId} isLoading={isLoadingMachines} onSelect={onSelectMachine} />
        {activeMachine ? (
          <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <InfoCard label="Código" value={activeMachine.codigo} />
            <InfoCard label="Ubicación" value={activeMachine.ubicacion} />
            <InfoCard label="Productos" value={`${productCount} asignados`} />
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-950 shadow-sm lg:w-80">
        <p className="font-bold">Flujo recomendado</p>
        <p className="mt-2 leading-6">Ejemplo: elige Máquina 1, presiona “Añadir producto”, selecciona Coca Cola y carga 20 unidades.</p>
      </div>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-slate-50 p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 font-semibold text-slate-900">{value}</p>
  </div>
);
