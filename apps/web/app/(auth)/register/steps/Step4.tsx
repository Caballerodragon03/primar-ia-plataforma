'use client';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import type { RegisterFormData } from '../types';

interface Step4Props {
  onBack: () => void;
  isSubmitting: boolean;
}

export function Step4({ onBack, isSubmitting }: Step4Props) {
  const { register, formState: { errors } } = useFormContext<RegisterFormData>();

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 rounded-input bg-gray-50 border border-border">
        <p className="text-sm text-gray-600 leading-relaxed">
          Your application will be sent for manual review after submission.
          You will be notified of the outcome via email within 1–2 business days.
          During this time, your access to the platform will be limited.
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
            I have read and agree to the{' '}
            <a href="/terms" target="_blank" className="font-semibold text-gray-900 underline">
              Terms &amp; Conditions
            </a>
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
            I have read and agree to the{' '}
            <a href="/privacy" target="_blank" className="font-semibold text-gray-900 underline">
              Privacy Policy
            </a>
          </span>
        </label>
        {errors.acceptedPrivacy && (
          <p role="alert" className="text-xs text-red-500 ml-7">⚠ {errors.acceptedPrivacy.message}</p>
        )}
      </div>

      <div className="flex gap-3 mt-2">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button type="submit" variant="primary" size="lg" className="flex-1" loading={isSubmitting}>
          Finish &amp; Submit for Verification
        </Button>
      </div>
    </div>
  );
}
