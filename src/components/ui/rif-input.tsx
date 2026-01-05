import React, { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface RifInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const RifInput = forwardRef<HTMLInputElement, RifInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    // Parse the current RIF value into prefix and number
    const parseRif = (rif: string) => {
      if (!rif) return { prefix: 'J', number: '', check: '' };

      const parts = rif.split('-');
      if (parts.length === 3) {
        return {
          prefix: parts[0] || 'J',
          number: parts[1] || '',
          check: parts[2] || '',
        };
      }

      // If no dashes, try to extract prefix from first character
      const firstChar = rif.charAt(0).toUpperCase();
      if (['J', 'V', 'E', 'G', 'P'].includes(firstChar)) {
        const remaining = rif.slice(1).replace(/\D/g, '');
        return {
          prefix: firstChar,
          number: remaining.slice(0, 8),
          check: remaining.slice(8, 9),
        };
      }

      return { prefix: 'J', number: rif.replace(/\D/g, '').slice(0, 9), check: '' };
    };

    const [rifParts, setRifParts] = useState(parseRif(value));

    // Update local state when value prop changes
    useEffect(() => {
      setRifParts(parseRif(value));
    }, [value]);

    const updateRif = (prefix: string, number: string, check: string) => {
      setRifParts({ prefix, number, check });

      // Only call onChange if we have at least prefix and number
      if (number) {
        const formattedRif = `${prefix}-${number}${check ? '-' + check : ''}`;
        onChange(formattedRif);
      } else if (!number && !check) {
        onChange('');
      }
    };

    const handlePrefixChange = (newPrefix: string) => {
      updateRif(newPrefix, rifParts.number, rifParts.check);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value.replace(/\D/g, ''); // Only digits
      const number = input.slice(0, 8);
      const check = input.slice(8, 9);
      updateRif(rifParts.prefix, number, check);
    };

    return (
      <div className={cn('flex gap-2', className)}>
        <Select value={rifParts.prefix} onValueChange={handlePrefixChange}>
          <SelectTrigger className="w-[80px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="J">J</SelectItem>
            <SelectItem value="V">V</SelectItem>
            <SelectItem value="E">E</SelectItem>
            <SelectItem value="G">G</SelectItem>
            <SelectItem value="P">P</SelectItem>
          </SelectContent>
        </Select>
        <Input
          ref={ref}
          value={rifParts.number + rifParts.check}
          onChange={handleNumberChange}
          placeholder="12345678-9"
          maxLength={10}
          className="flex-1"
          {...props}
        />
      </div>
    );
  }
);

RifInput.displayName = 'RifInput';

export { RifInput };