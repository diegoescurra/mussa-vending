import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

export const NumberField = ({
  label,
  value,
  onChange,
  required = false,
  className = '',
  error,
  min = 0,
  max,
  step,
}: NumberFieldProps) => {
  const errorId = useId();
  return (
    <Label className={`grid gap-2 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <Input
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
        className="w-full bg-white"
      />
      {error ? (
        <span id={errorId} className="text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </Label>
  );
};
