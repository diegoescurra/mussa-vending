import { useId } from 'react';

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  rows?: number;
  error?: string;
};

const inputClass = 'rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

export const TextField = ({ label, value, onChange, required = false, className = '', rows, error }: TextFieldProps) => {
  const errorId = useId();
  const accessibility = { 'aria-label': label, 'aria-invalid': Boolean(error), 'aria-describedby': error ? errorId : undefined };
  return (
    <label className={`grid gap-2 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      {rows ? (
        <textarea {...accessibility} required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className={inputClass} />
      ) : (
        <input {...accessibility} required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
      )}
      {error ? <span id={errorId} className="text-xs text-red-700">{error}</span> : null}
    </label>
  );
};
