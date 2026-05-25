'use client';
import Link from 'next/link';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { RegisterFormData } from '../types';

interface Step4Props {
  onBack: () => void;
  isSubmitting: boolean;
}

export function Step4({ onBack, isSubmitting }: Step4Props) {
  const t = useT();
  const { register, formState: { errors } } = useFormContext<RegisterFormData>();

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 rounded-input bg-gray-50 border border-border">
        <p className="text-sm text-gray-600 leading-relaxed">
          {t('register.step4.review')}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer"
            {...register('acceptedTerms')}
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            {t('register.step4.termsAccept')}{' '}
            <Link href="/terms" target="_blank" className="font-semibold text-gray-900 underline">
              {t('register.step4.terms')}
            </Link>
          </span>
        </label>
        {errors.acceptedTerms && (
          <p role="alert" className="text-xs text-red-500 ml-7">⚠ {errors.acceptedTerms.message}</p>
        )}

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 rounded border-border accent-primary cursor-pointer"
            {...register('acceptedPrivacy')}
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            {t('register.step4.privacyAccept')}{' '}
            <Link href="/privacy" target="_blank" className="font-semibold text-gray-900 underline">
              {t('register.step4.privacy')}
            </Link>
          </span>
        </label>
        {errors.acceptedPrivacy && (
          <p role="alert" className="text-xs text-red-500 ml-7">⚠ {errors.acceptedPrivacy.message}</p>
        )}
      </div>

      <div className="flex gap-3 mt-2">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onBack} disabled={isSubmitting}>
          {t('register.step4.back')}
        </Button>
        <Button type="submit" variant="primary" size="lg" className="flex-1" loading={isSubmitting}>
          {t('register.step4.submit')}
        </Button>
      </div>
    </div>
  );
}
