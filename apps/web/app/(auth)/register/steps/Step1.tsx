'use client';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { RegisterFormData } from '../types';

const LANGUAGE_OPTIONS = [
  { value: 'ES', label: 'Español' },
  { value: 'EN', label: 'English' },
];

interface Step1Props {
  onNext: () => void;
}

export function Step1({ onNext }: Step1Props) {
  const { register, formState: { errors }, watch, setValue } = useFormContext<RegisterFormData>();
  const selectedRole = watch('role');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Account Type <span className="text-red-500">*</span></p>
        <div className="flex rounded-input border border-border overflow-hidden">
          {(['VENDEDOR', 'COMPRADOR'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setValue('role', role, { shouldValidate: true })}
              className={[
                'flex-1 py-2.5 text-sm font-semibold transition-colors duration-150 cursor-pointer min-h-[44px]',
                selectedRole === role
                  ? 'bg-primary text-gray-900'
                  : 'bg-white text-secondary hover:bg-gray-50',
              ].join(' ')}
            >
              {role === 'VENDEDOR' ? 'SELLER' : 'BUYER'}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Corporate Email"
        type="email"
        placeholder="you@company.com"
        autoComplete="email"
        required
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Create Password"
        showPasswordToggle
        autoComplete="new-password"
        required
        hint="Minimum 12 characters"
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Contact Phone Number"
        type="tel"
        placeholder="+34 600 000 000"
        autoComplete="tel"
        error={errors.telefono?.message}
        {...register('telefono')}
      />

      <Select
        label="Preferred Language"
        options={LANGUAGE_OPTIONS}
        {...register('idioma')}
      />

      <Button type="button" variant="primary" size="lg" className="w-full mt-2" onClick={onNext}>
        Continue to Business Details
      </Button>
    </div>
  );
}
