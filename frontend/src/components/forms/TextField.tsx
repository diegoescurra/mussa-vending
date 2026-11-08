import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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

const inputClass = 'w-full bg-white';

export const TextField = ({
  label,
  value,
  onChange,
  required = false,
  className = '',
  rows,
  error,
}: TextFieldProps) => {
  const errorId = useId();
  const accessibility = {
    'aria-label': label,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
  };
  return (
    <Label className={`grid gap-2 text-sm font-medium text-slate-700 ${className}`}>
      {label}
      {rows ? (
        <Textarea
          {...accessibility}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          className={inputClass}
        />
      ) : (
        <Input
          {...accessibility}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}
      {error ? (
        <span id={errorId} className="text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </Label>
  );
};
