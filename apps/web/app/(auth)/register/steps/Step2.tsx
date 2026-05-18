'use client';
import type { ChangeEvent } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { RegisterFormData } from '../types';

const REGIMEN_FISCAL_OPTIONS = [
  { value: '', label: 'Selecciona régimen fiscal...' },
  { value: 'GENERAL', label: 'General (IVA 21%, sin retención)' },
  { value: 'AGRARIO', label: 'Régimen especial agrario (IVA 4/10%, IRPF 2%)' },
  { value: 'RECARGO_EQUIVALENCIA', label: 'Recargo de equivalencia (minorista)' },
  { value: 'EXENTO', label: 'Exento (intracomunitario, exportación...)' },
];

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

// IBAN format check shared with backend (ES + 2 control + 4-30 alfanum).
const ibanFormat = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;

export function Step2({ onNext, onBack }: Step2Props) {
  const { register, watch, setError, clearErrors, formState: { errors } } = useFormContext<RegisterFormData>();
  const role = watch('role');
  const isSeller = role === 'VENDEDOR';

  const handleNext = () => {
    // Extra conditional validation for sellers — defer to backend if user
    // somehow bypasses this, but the friendlier UX is to flag here.
    if (isSeller) {
      const ibanRaw = (watch('iban') ?? '').toUpperCase().replace(/\s+/g, '');
      const regimen = watch('regimenFiscal');
      let ok = true;
      if (!ibanRaw || !ibanFormat.test(ibanRaw)) {
        setError('iban', { message: 'IBAN inválido — obligatorio para vendedores' });
        ok = false;
      } else {
        clearErrors('iban');
      }
      if (!regimen) {
        setError('regimenFiscal', { message: 'Selecciona el régimen fiscal' });
        ok = false;
      } else {
        clearErrors('regimenFiscal');
      }
      if (!ok) return;
    }
    onNext();
  };

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

      {isSeller && (
        <div>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">
            Datos bancarios y fiscales (sólo vendedores)
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Necesarios para emitir facturas con la fiscalidad correcta y para que el comprador pueda transferirte. <strong>Sólo se introducen una vez aquí</strong> — para modificarlos posteriormente deberás contactar con Primar-IA.
          </p>
          <div className="flex flex-col gap-4">
            <Input
              label="IBAN"
              placeholder="ES12 1234 1234 12 1234567890"
              required
              hint="IBAN europeo — 24 caracteres (España). Se normaliza automáticamente."
              error={errors.iban?.message}
              {...register('iban', {
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  // Stripping spaces + uppercasing as you type so the UX matches the validation.
                  e.target.value = e.target.value.toUpperCase().replace(/\s+/g, '');
                },
              })}
            />
            <Input
              label="SWIFT / BIC"
              placeholder="BSCHESMM (opcional, sólo cuentas no-IBAN)"
              error={errors.swiftBic?.message}
              {...register('swiftBic')}
            />
            <Select
              label="Régimen fiscal"
              required
              options={REGIMEN_FISCAL_OPTIONS}
              error={errors.regimenFiscal?.message}
              {...register('regimenFiscal')}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="primary" size="lg" className="flex-1" onClick={handleNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
