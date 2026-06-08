'use client';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { RegisterFormData } from '../types';

interface Step1Props {
  onNext: () => void;
}

export function Step1({ onNext }: Step1Props) {
  const t = useT();
  const { register, formState: { errors }, watch, setValue } = useFormContext<RegisterFormData>();
  const selectedRole = watch('role');

  const LANGUAGE_OPTIONS = [
    { value: 'ES', label: 'Español' },
    { value: 'EN', label: 'English' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">{t('register.step1.accountType')} <span className="text-red-500">*</span></p>
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
              {role === 'VENDEDOR' ? t('register.step1.seller') : t('register.step1.buyer')}
            </button>
          ))}
        </div>
      </div>

      <Input
        label={t('register.step1.email')}
        type="email"
        placeholder={t('register.step1.emailPh')}
        autoComplete="email"
        required
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label={t('register.step1.password')}
        showPasswordToggle
        autoComplete="new-password"
        required
        hint={t('register.step1.passwordHint')}
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label={t('register.step1.confirmPassword')}
        showPasswordToggle
        autoComplete="new-password"
        required
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Input
        label={t('register.step1.phone')}
        type="tel"
        placeholder="+34 600 000 000"
        autoComplete="tel"
        error={errors.telefono?.message}
        {...register('telefono')}
      />

      <Select
        label={t('register.step1.language')}
        options={LANGUAGE_OPTIONS}
        {...register('idioma')}
      />

      <Button type="button" variant="primary" size="lg" className="w-full mt-2" onClick={onNext}>
        {t('register.step1.continue')}
      </Button>
    </div>
  );
}
