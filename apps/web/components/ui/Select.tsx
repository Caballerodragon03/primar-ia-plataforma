'use client';
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, className = '', ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={[
              'w-full px-3 py-2.5 min-h-[44px] rounded-input border text-sm appearance-none',
              'text-gray-900 bg-white cursor-pointer',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              error ? 'border-red-400' : 'border-border hover:border-gray-400',
              className,
            ].join(' ')}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-500">⚠ {error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
