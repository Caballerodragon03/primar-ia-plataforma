'use client';
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, showPasswordToggle = false, type = 'text', id, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={[
              'w-full px-3 py-2.5 min-h-[44px] rounded-input border text-sm',
              'text-gray-900 placeholder-gray-400 bg-white',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
              error
                ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                : 'border-border hover:border-gray-400',
              showPasswordToggle ? 'pr-10' : '',
              className,
            ].join(' ')}
            {...props}
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none min-w-[24px] min-h-[24px] flex items-center justify-center"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-gray-500">{hint}</p>
        )}
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-red-500 flex items-center gap-1">
            <span>⚠</span> {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
