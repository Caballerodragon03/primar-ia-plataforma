'use client';
import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { StepProgress } from '@/components/ui/StepProgress';
import { Button } from '@/components/ui/Button';
import { Step1 } from './steps/Step1';
import { Step2 } from './steps/Step2';
import { Step3 } from './steps/Step3';
import { Step4 } from './steps/Step4';
import { api } from '@/lib/api';
import type { RegisterFormData } from './types';

const STEP_LABELS = ['Account Creation', 'Company Details', 'Documents', 'Legal & Compliance'];

const step1Schema = z.object({
  role: z.enum(['VENDEDOR', 'COMPRADOR']),
  email: z.string().email('Invalid email'),
  password: z.string().min(12, 'Minimum 12 characters'),
  telefono: z.string().optional(),
  idioma: z.enum(['ES', 'EN']).default('ES'),
});

const step2Schema = z.object({
  razonSocial: z.string().min(2, 'Required'),
  cifNif: z.string().regex(/^[A-Z0-9]{9}$/, 'Must be exactly 9 alphanumeric characters (e.g. B12345678)'),
  formaJuridica: z.string().optional(),
  direccionFiscal: z.string().min(5, 'Required'),
  ciudad: z.string().optional(),
  codigoPostal: z.string().optional(),
  pais: z.string().default('ES'),
  nombre: z.string().min(1, 'Required'),
  apellidos: z.string().min(1, 'Required'),
  personaContactoLegal: z.string().optional(),
  cargoContactoLegal: z.string().min(2, 'Required'),
});

const fullSchema = step1Schema.merge(step2Schema).extend({
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los Términos y Condiciones' }) }),
  acceptedPrivacy: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar la Política de Privacidad' }) }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STEP_SCHEMAS: z.ZodSchema<any>[] = [step1Schema, step2Schema, z.object({}), fullSchema];

interface SuccessState {
  email: string;
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(STEP_SCHEMAS[currentStep - 1] ?? z.object({})),
    defaultValues: {
      role: 'VENDEDOR',
      idioma: 'ES',
      pais: 'ES',
    },
    mode: 'onBlur',
  });

  const { handleSubmit, trigger, formState: { isSubmitting } } = methods;

  const nextStep = async () => {
    const schema = STEP_SCHEMAS[currentStep - 1];
    if (!schema) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shape = (schema as any)._def?.shape?.() ?? {};
    const fields = Object.keys(shape) as (keyof RegisterFormData)[];
    const valid = await trigger(fields.length > 0 ? fields : undefined);
    if (valid) setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        role: data.role,
        telefono: data.telefono || undefined,
        idioma: data.idioma,
        razonSocial: data.razonSocial,
        cifNif: data.cifNif.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        formaJuridica: data.formaJuridica || undefined,
        direccionFiscal: data.direccionFiscal,
        ciudad: data.ciudad || undefined,
        codigoPostal: data.codigoPostal || undefined,
        pais: data.pais,
        nombre: data.nombre,
        apellidos: data.apellidos,
        personaContactoLegal: `${data.nombre} ${data.apellidos}`,
        cargoContactoLegal: data.cargoContactoLegal,
      });
      setSuccess({ email: data.email });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string }; status?: number }; message?: string; code?: string };
      const message = axiosErr?.response?.data?.error
        ?? (axiosErr?.code === 'ECONNABORTED' ? 'Connection timed out. Please try again.' : null)
        ?? (axiosErr?.message ? `Error: ${axiosErr.message}` : 'Registration failed. Please try again.');
      setServerError(message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-surface rounded-card shadow-sm border border-border p-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">We have received your Registration Submission!</h2>
            <p className="text-secondary text-sm mb-6">
              We will verify your information and you will receive confirmation on the status of the submission shortly.
            </p>
            <div className="bg-gray-50 rounded-input p-4 mb-6 text-left">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-secondary">E-mail</span>
                <span className="font-medium text-gray-900">{success.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Password</span>
                <span className="font-medium text-gray-900">••••••••••</span>
              </div>
            </div>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full">Go Back to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Primar<span className="text-primary">-IA</span>
          </h1>
          <p className="text-secondary text-sm mt-1">Create your account</p>
        </div>

        <div className="bg-surface rounded-card shadow-sm border border-border p-8">
          <StepProgress currentStep={currentStep} totalSteps={4} stepLabels={STEP_LABELS} />

          {serverError && (
            <div role="alert" className="mb-4 p-3 rounded-input bg-red-50 border border-red-200 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {currentStep === 1 && <Step1 onNext={nextStep} />}
              {currentStep === 2 && <Step2 onNext={nextStep} onBack={prevStep} />}
              {currentStep === 3 && <Step3 onNext={nextStep} onBack={prevStep} />}
              {currentStep === 4 && <Step4 onBack={prevStep} isSubmitting={isSubmitting} />}
            </form>
          </FormProvider>

          <p className="text-center text-sm text-secondary mt-6">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-gray-900 hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
