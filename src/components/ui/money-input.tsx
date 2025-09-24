import React, { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatNumber, parseVenezuelanNumber } from '@/lib/formatters';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  currency?: 'VES' | 'USD';
}

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, value, onChange, currency = 'VES', ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => 
      value > 0 ? formatNumber(value) : ''
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setDisplayValue(inputValue);
      
      const numericValue = parseVenezuelanNumber(inputValue);
      onChange(numericValue);
    };

    const handleBlur = () => {
      if (value > 0) {
        setDisplayValue(formatNumber(value));
      }
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn('pr-12', className)}
          placeholder="0,00"
          {...props}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-sm text-muted-foreground">{currency}</span>
        </div>
      </div>
    );
  }
);

MoneyInput.displayName = 'MoneyInput';

export { MoneyInput };