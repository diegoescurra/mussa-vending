import { useId } from 'react';

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  error?: string;
  min?: number;
  max?: number;
  step?: number;
};

export const NumberField = ({ label, value, onChange, required = false, className = '', error, min = 0, max, step }: NumberFieldProps) => {
  const errorId = useId();
  return (
    <label className={`grid gap-2 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <input
        required={required}
        type="number"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 rounded-2xl border px-4 py-3 outline-none focus:ring-4 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
      />
      {error ? <span id={errorId} className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
};
