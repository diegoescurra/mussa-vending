import { useDeferredValue, useState } from 'react';
import type { Maquina } from '../services/maquinas.service';

type MachineComboboxProps = {
  machines: Maquina[];
  selectedMachineId: string;
  isLoading?: boolean;
  onSelect: (machineId: string) => void;
};

const normalizeText = (value: string) => value.toLocaleLowerCase('es-CL').trim();

export const MachineCombobox = ({ machines, selectedMachineId, isLoading = false, onSelect }: MachineComboboxProps) => {
  const selectedMachine = machines.find((machine) => String(machine.id_maquina) === selectedMachineId);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = normalizeText(deferredQuery);

  const filteredMachines = normalizedQuery
    ? machines.filter((machine) => {
        const searchableText = normalizeText(`${machine.codigo} ${machine.nombre} ${machine.ubicacion}`);
        return searchableText.includes(normalizedQuery);
      })
    : machines;

  const handleSelect = (machineId: string) => {
    onSelect(machineId);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Buscar máquina
        <input
          value={isOpen ? query : selectedMachine ? `${selectedMachine.codigo} - ${selectedMachine.nombre} (${selectedMachine.ubicacion})` : query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={isLoading || machines.length === 0}
          placeholder={isLoading ? 'Cargando máquinas...' : 'Busca por código, nombre o ubicación'}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
        />
      </label>

      {isOpen ? (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          {filteredMachines.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500">No encontramos máquinas con ese texto.</div>
          ) : (
            filteredMachines.map((machine) => {
              const isSelected = String(machine.id_maquina) === selectedMachineId;

              return (
                <button
                  key={machine.id_maquina}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(String(machine.id_maquina))}
                  className={`w-full rounded-xl px-3 py-3 text-left transition ${isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">{machine.codigo} - {machine.nombre}</p>
                      <p className="mt-1 text-xs text-slate-500">{machine.ubicacion}</p>
                    </div>
                    {isSelected ? <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">Seleccionada</span> : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      ) : null}

      {isOpen ? <button type="button" aria-label="Cerrar selector" className="fixed inset-0 z-20 cursor-default" onClick={() => setIsOpen(false)} /> : null}
    </div>
  );
};
