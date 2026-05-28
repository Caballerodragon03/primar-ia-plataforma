'use client';
import type { ChangeEvent } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { RegisterFormData } from '../types';

interface Step2Props {
  onNext: () => void;
  onBack: () => void;
}

// IBAN format check shared with backend (ES + 2 control + 4-30 alfanum).
const ibanFormat = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;

export function Step2({ onNext, onBack }: Step2Props) {
  const t = useT();
  const { register, watch, setError, clearErrors, formState: { errors } } = useFormContext<RegisterFormData>();
  const role = watch('role');
  const isSeller = role === 'VENDEDOR';

  const REGIMEN_FISCAL_OPTIONS = [
    { value: '', label: t('register.step2.regimenFiscalPh') },
    { value: 'GENERAL', label: t('register.step2.regimenGeneral') },
    { value: 'AGRARIO', label: t('register.step2.regimenAgrario') },
    { value: 'RECARGO_EQUIVALENCIA', label: t('register.step2.regimenRecargo') },
    { value: 'EXENTO', label: t('register.step2.regimenExento') },
  ];

  const LEGAL_FORM_OPTIONS = [
    { value: '', label: t('register.step2.legalFormPh') },
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

  const handleNext = () => {
    // Extra conditional validation for sellers — defer to backend if user
    // somehow bypasses this, but the friendlier UX is to flag here.
    if (isSeller) {
      const ibanRaw = (watch('iban') ?? '').toUpperCase().replace(/\s+/g, '');
      const regimen = watch('regimenFiscal');
      let ok = true;
      if (!ibanRaw || !ibanFormat.test(ibanRaw)) {
        setError('iban', { message: t('register.step2.ibanInvalid') });
        ok = false;
      } else {
        clearErrors('iban');
      }
      if (!regimen) {
        setError('regimenFiscal', { message: t('register.step2.regimenMissing') });
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
      {/* Datos de la empresa */}
      <div>
        <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">{t('register.step2.companyHeader')}</h3>
        <div className="flex flex-col gap-4">
          <Input
            label={t('register.step2.razonSocial')}
            placeholder={t('register.step2.razonSocialPh')}
            required
            error={errors.razonSocial?.message}
            {...register('razonSocial')}
          />
          <Select
            label={t('register.step2.legalForm')}
            options={LEGAL_FORM_OPTIONS}
            error={errors.formaJuridica?.message}
            {...register('formaJuridica')}
          />
          <Input
            label={t('register.step2.cifNif')}
            placeholder="B12345678"
            required
            hint={t('register.step2.cifNifHint')}
            error={errors.cifNif?.message}
            {...register('cifNif', {
              onChange: (e: ChangeEvent<HTMLInputElement>) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
              },
            })}
          />
        </div>
      </div>

      {/* Dirección */}
      <div>
        <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">{t('register.step2.addressHeader')}</h3>
        <div className="flex flex-col gap-4">
          <Input
            label={t('register.step2.street')}
            placeholder={t('register.step2.streetPh')}
            required
            error={errors.direccionFiscal?.message}
            {...register('direccionFiscal')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('register.step2.city')}
              placeholder="Valencia"
              error={errors.ciudad?.message}
              {...register('ciudad')}
            />
            <Input
              label={t('register.step2.zip')}
              placeholder="46001"
              error={errors.codigoPostal?.message}
              {...register('codigoPostal')}
            />
          </div>
          <Select
            label={t('register.step2.country')}
            options={COUNTRY_OPTIONS}
            {...register('pais')}
          />
        </div>
      </div>

      {/* Contacto legal */}
      <div>
        <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">{t('register.step2.legalContactHeader')}</h3>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('register.step2.name')}
              placeholder="Juan"
              required
              error={errors.nombre?.message}
              {...register('nombre')}
            />
            <Input
              label={t('register.step2.lastName')}
              placeholder="García"
              required
              error={errors.apellidos?.message}
              {...register('apellidos')}
            />
          </div>
          <Input
            label={t('register.step2.position')}
            placeholder={t('register.step2.positionPh')}
            required
            error={errors.cargoContactoLegal?.message}
            {...register('cargoContactoLegal')}
          />
        </div>
      </div>

      {isSeller && (
        <div>
          <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">
            {t('register.step2.sellerBankHeader')}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {t('register.step2.sellerBankDesc')}
          </p>
          <div className="flex flex-col gap-4">
            <Input
              label={t('register.step2.iban')}
              placeholder="ES12 1234 1234 12 1234567890"
              required
              hint={t('register.step2.ibanHint')}
              error={errors.iban?.message}
              {...register('iban', {
                onChange: (e: ChangeEvent<HTMLInputElement>) => {
                  // Stripping spaces + uppercasing as you type so the UX matches the validation.
                  e.target.value = e.target.value.toUpperCase().replace(/\s+/g, '');
                },
              })}
            />
            <Input
              label={t('register.step2.swift')}
              placeholder={t('register.step2.swiftPh')}
              error={errors.swiftBic?.message}
              {...register('swiftBic')}
            />
            <Select
              label={t('register.step2.regimenFiscal')}
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
          {t('register.step2.back')}
        </Button>
        <Button type="button" variant="primary" size="lg" className="flex-1" onClick={handleNext}>
          {t('register.step2.continue')}
        </Button>
      </div>
    </div>
  );
}
