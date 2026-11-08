import type { ReactNode } from 'react';
import { StateMessage } from '../../components/StateMessage';
import { MoneyText } from '../../components/ui/MoneyText';
import type { ReposicionLine } from './reposicion.calculations';

export const StepTitle = ({ title, description }: { title: string; description: string }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">{title}</p>
    <h2 className="mt-2 text-xl font-bold text-slate-950">{description}</h2>
  </div>
);

export const MachineSummary = ({ codigo, nombre, ubicacion }: { codigo: string; nombre: string; ubicacion: string }) => (
  <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-950">
    <p className="font-bold">{codigo} - {nombre}</p>
    <p className="mt-1">{ubicacion}</p>
  </div>
);

export const ProductReviewTable = ({ rows }: { rows: ReposicionLine[] }) => {
  if (rows.length === 0) {
    return <StateMessage title="Sin productos" description="Esta máquina todavía no tiene productos asignados." />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.id_maquina_producto} className="rounded-2xl border border-slate-200 p-4 text-sm">
          <p className="font-bold text-slate-950">{row.producto_nombre}</p>
          <p className="mt-1 text-slate-600">Stock sistema: {row.stock_actual}</p>
          <p className="text-slate-600">Capacidad: {row.capacidad_maxima}</p>
          <p className="text-slate-600">Precio actual: <MoneyText value={row.precio_venta_actual} /></p>
        </div>
      ))}
    </div>
  );
};

export const LineInputCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 p-4">
    <div className="mb-3">
      <p className="font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
    {children}
  </div>
);

export const NumberInput = ({
  label,
  value,
  onChange,
  max,
  error,
  hint,
  step = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  error?: string;
  hint?: string;
  step?: number | 'any';
}) => (
  <label className="grid gap-2 text-sm font-semibold text-slate-700">
    {label}
    <input
      type="number"
      min="0"
      step={step}
      max={max}
      inputMode="numeric"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded-2xl border px-4 py-3 text-lg font-semibold outline-none focus:ring-4 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
    />
    {hint && !error ? <span className="text-xs font-medium text-slate-500">{hint}</span> : null}
    {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
  </label>
);

export const SummaryRow = ({ label, value, highlight }: { label: string; value: ReactNode; highlight?: 'positive' | 'negative' }) => {
  const valueClass = highlight === 'positive' ? 'text-emerald-700' : highlight === 'negative' ? 'text-red-700' : 'text-slate-950';

  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-lg font-bold ${valueClass}`}>{value}</span>
    </div>
  );
};
