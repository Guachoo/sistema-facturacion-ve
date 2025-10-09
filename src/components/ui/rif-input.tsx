import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatRIF } from '@/lib/formatters';

interface RifInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const RifInput = forwardRef<HTMLInputElement, RifInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formattedRif = formatRIF(inputValue);
      onChange(formattedRif);
    };

    return (
      <Input
        ref={ref}
        value={value}
        onChange={handleChange}
        className={cn(className)}
        placeholder="J-12345678-9"
        maxLength={12}
        {...props}
      />
    );
  }
);

RifInput.displayName = 'RifInput';

export { RifInput };