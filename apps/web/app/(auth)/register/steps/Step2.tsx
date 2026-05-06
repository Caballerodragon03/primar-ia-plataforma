'use client';
import type { ChangeEvent } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { RegisterFormData } from '../types';

const LEGAL_FORM_OPTIONS = [
  { value: '', label: 'Select legal form...' },
  { value: 'SL', label: 'S.L. (Sociedad Limitada)' },
  { value: 'SA', label: 'S.A. (Sociedad Anónima)' },
  { value: 'AUTONOMO', label: 'Autónomo' },
  { value: 'COOPERATIVA', label: 'Cooperativa' },
  { value: 'OTRO', label: 'Otro' },
];

const COUNTRY_OPTIONS = [
  { value: 'ES', label: 'España' },
  { value: 'PT', label: 'Portugal' },
  { value: 'DE', label: 'Deutschland' },
  { value: 'FR', label: 'France' },
  { value: 'IT', label: 'Italia' },
  { value: 'GB', label: 'United Kingdom' },
];

interface Step2Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step2({ onNext, onBack }: Step2Props) {
  const { register, formState: { errors } } = useFormContext<RegisterFormData>();

  return (
    <div className="flex flex-col gap-5">
      {/* Company Information */}
      <div>
        <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Company Information</h3>
        <div className="flex flex-col gap-4">
          <Input
            label="Legal Name"
            placeholder="Frutas García S.L."
            required
            error={errors.razonSocial?.message}
            {...register('razonSocial')}
          />
          <Select
            label="Legal Form"
            options={LEGAL_FORM_OPTIONS}
            error={errors.formaJuridica?.message}
            {...register('formaJuridica')}
          />
          <Input
            label="CIF / NIF"
            placeholder="B12345678"
            required
            hint="9 characters — letter + 8 digits (e.g. B12345678)"
            error={errors.cifNif?.message}
            {...register('cifNif', {
              onChange: (e: ChangeEvent<HTMLInputElement>) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 9);
              },
            })}
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Address Information</h3>
        <div className="flex flex-col gap-4">
          <Input
            label="Street Address"
            placeholder="Calle Mayor 1"
            required
            error={errors.direccionFiscal?.message}
            {...register('direccionFiscal')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              placeholder="Valencia"
              error={errors.ciudad?.message}
              {...register('ciudad')}
            />
            <Input
              label="Postal Code"
              placeholder="46001"
              error={errors.codigoPostal?.message}
              {...register('codigoPostal')}
            />
          </div>
          <Select
            label="Country"
            options={COUNTRY_OPTIONS}
            {...register('pais')}
          />
        </div>
      </div>

      {/* Legal Contact */}
      <div>
        <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Legal Contact Person</h3>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="Juan"
              required
              error={errors.nombre?.message}
              {...register('nombre')}
            />
            <Input
              label="Last Name"
              placeholder="García"
              required
              error={errors.apellidos?.message}
              {...register('apellidos')}
            />
          </div>
          <Input
            label="Position / Title"
            placeholder="CEO"
            required
            error={errors.cargoContactoLegal?.message}
            {...register('cargoContactoLegal')}
          />
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="primary" size="lg" className="flex-1" onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
