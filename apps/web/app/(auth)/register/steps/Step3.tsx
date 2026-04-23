'use client';
import { useFormContext } from 'react-hook-form';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Button } from '@/components/ui/Button';
import type { RegisterFormData } from '../types';

interface Step3Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step3({ onNext, onBack }: Step3Props) {
  const { watch } = useFormContext<RegisterFormData>();
  const role = watch('role');

  return (
    <div className="flex flex-col gap-5">
      <div className="p-3 rounded-input bg-yellow-50 border border-yellow-200">
        <p className="text-sm text-yellow-800 font-medium">
          Documents are NOT mandatory but will position you better in the marketplace.
        </p>
      </div>

      {role === 'VENDEDOR' ? (
        <>
          <FileDropzone
            label="Proof of Land Ownership or Lease"
            hint="Official document proving access to agricultural land"
          />
          <FileDropzone
            label="GlobalG.A.P. or Food Safety Certificate"
            hint="Certification from an accredited body"
          />
          <FileDropzone
            label="Organic Certification (if applicable)"
            hint="e.g. CAAE, CCPAE or EU Organic logo"
          />
        </>
      ) : (
        <>
          <FileDropzone
            label="Company Registration Document"
            hint="Official registration from Registro Mercantil or equivalent"
          />
          <FileDropzone
            label="Import / Export License (if applicable)"
            hint="Required for international trade operations"
          />
        </>
      )}

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
