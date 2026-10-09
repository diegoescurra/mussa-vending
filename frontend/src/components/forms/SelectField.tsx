import { useId } from 'react';

type SelectOption = {
  value: string | number;
  label: string;
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  hint?: string;
  error?: string;
};

export const SelectField = ({
  label,
  value,
  options,
  onChange,
  required = false,
  disabled = false,
  placeholder,
  className = '',
  hint,
  error,
}: SelectFieldProps) => {
  const descriptionId = useId();
  return (
    <label className={`grid gap-2 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <select
        required={required}
        disabled={disabled}
        aria-label={label}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? descriptionId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 rounded-2xl border px-4 py-3 outline-none focus:ring-4 disabled:bg-slate-100 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'}`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error || hint ? <span id={descriptionId} className={`text-xs ${error ? 'text-red-700' : 'text-amber-700'}`}>{error || hint}</span> : null}
    </label>
  );
};
