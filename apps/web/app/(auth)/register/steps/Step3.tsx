'use client';
import { useFormContext } from 'react-hook-form';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { RegisterFormData } from '../types';

interface Step3Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step3({ onNext, onBack }: Step3Props) {
  const t = useT();
  const { watch } = useFormContext<RegisterFormData>();
  const role = watch('role');

  return (
    <div className="flex flex-col gap-5">
      <div className="p-3 rounded-input bg-yellow-50 border border-yellow-200">
        <p className="text-sm text-yellow-800 font-medium">
          {t('register.step3.optionalDocs')}
        </p>
      </div>

      {role === 'VENDEDOR' ? (
        <>
          <FileDropzone
            label={t('register.step3.seller.land')}
            hint={t('register.step3.seller.landHint')}
          />
          <FileDropzone
            label={t('register.step3.seller.gap')}
            hint={t('register.step3.seller.gapHint')}
          />
          <FileDropzone
            label={t('register.step3.seller.organic')}
            hint={t('register.step3.seller.organicHint')}
          />
        </>
      ) : (
        <>
          <FileDropzone
            label={t('register.step3.buyer.registration')}
            hint={t('register.step3.buyer.registrationHint')}
          />
          <FileDropzone
            label={t('register.step3.buyer.license')}
            hint={t('register.step3.buyer.licenseHint')}
          />
        </>
      )}

      <div className="flex gap-3 mt-2">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onBack}>
          {t('register.step3.back')}
        </Button>
        <Button type="button" variant="primary" size="lg" className="flex-1" onClick={onNext}>
          {t('register.step3.continue')}
        </Button>
      </div>
    </div>
  );
}
