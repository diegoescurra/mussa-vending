import { MachineCombobox } from '../../../components/MachineCombobox';
import { Card, CardContent } from '@/components/ui/card';
import type { Maquina } from '../../../services/maquinas.service';
type Props = {
  machines: Maquina[];
  selectedMachineId: string;
  isLoadingMachines: boolean;
  productCount: number;
  onSelectMachine: (id: string) => void;
};
export function MachineInventoryHeader({
  machines,
  selectedMachineId,
  isLoadingMachines,
  productCount,
  onSelectMachine,
}: Props) {
  const active = machines.find((machine) => String(machine.id_maquina) === selectedMachineId);
  return (
    <Card className="mb-6 shadow-none">
      <CardContent className="grid items-center gap-5 md:grid-cols-2">
        <MachineCombobox
          machines={machines}
          selectedMachineId={selectedMachineId}
          isLoading={isLoadingMachines}
          onSelect={onSelectMachine}
        />
        {active ? (
          <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Código</dt>
              <dd className="mt-1 font-medium">{active.codigo}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Ubicación</dt>
              <dd className="mt-1 font-medium">{active.ubicacion}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Productos</dt>
              <dd className="mt-1 font-medium">{productCount} asignados</dd>
            </div>
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
