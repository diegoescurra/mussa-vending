import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
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
    <Label className={`grid gap-2 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <NativeSelect
        required={required}
        disabled={disabled}
        aria-label={label}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? descriptionId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-white"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
      {error || hint ? (
        <span id={descriptionId} className={`text-xs ${error ? 'text-red-700' : 'text-amber-700'}`}>
          {error || hint}
        </span>
      ) : null}
    </Label>
  );
};
