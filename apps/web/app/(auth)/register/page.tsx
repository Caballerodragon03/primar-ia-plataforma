'use client';
import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { StepProgress } from '@/components/ui/StepProgress';
import { Button } from '@/components/ui/Button';
import { Step1 } from './steps/Step1';
import { Step2 } from './steps/Step2';
import { Step3 } from './steps/Step3';
import { Step4 } from './steps/Step4';
import { api } from '@/lib/api';
import { Logo } from '@/components/brand/Logo';
import { LogoIcon } from '@/components/brand/LogoIcon';
import { Progress } from '@/components/shadcn/progress';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { RegisterFormData } from './types';

const step1Schema = z.object({
  role: z.enum(['VENDEDOR', 'COMPRADOR']),
  email: z.string().email('Email no válido'),
  password: z.string().min(12, 'Mínimo 12 caracteres'),
  telefono: z.string().optional(),
  idioma: z.enum(['ES', 'EN']).default('ES'),
});

// IBAN: 2 letras (país) + 2 dígitos control + hasta 30 alfanuméricos.
const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;

// Keep the base step2 as a plain ZodObject so the multi-step trigger() helper
// (which reads .shape) still works. Conditional validation for vendor-only
// banking/fiscal fields is enforced separately in the form (see Step2.tsx)
// and on the backend (registerSchema.superRefine).
const step2Schema = z.object({
  role: z.enum(['VENDEDOR', 'COMPRADOR']).optional(),
  razonSocial: z.string().min(2, 'Obligatorio'),
  // Acepta CIF/NIF español + VAT IDs internacionales (4-20 caracteres
  // alfanuméricos). Coincide con backend en apps/api/.../auth.schema.ts.
  cifNif: z.string().regex(/^[A-Z0-9]{4,20}$/, 'Tax ID inválido — 4 a 20 caracteres alfanuméricos'),
  formaJuridica: z.string().optional(),
  direccionFiscal: z.string().min(5, 'Obligatorio'),
  ciudad: z.string().optional(),
  codigoPostal: z.string().optional(),
  pais: z.string().default('ES'),
  nombre: z.string().min(1, 'Obligatorio'),
  apellidos: z.string().min(1, 'Obligatorio'),
  personaContactoLegal: z.string().optional(),
  cargoContactoLegal: z.string().min(2, 'Obligatorio'),
  iban: z.string().optional()
    .refine((v) => !v || ibanRegex.test(v.toUpperCase().replace(/\s+/g, '')), {
      message: 'IBAN inválido — formato ES12 1234 1234 12 1234567890',
    }),
  swiftBic: z.string().optional(),
  regimenFiscal: z.enum(['GENERAL', 'AGRARIO', 'RECARGO_EQUIVALENCIA', 'EXENTO']).optional(),
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
  const t = useT();
  // Phase 14M v3.39 — STEP_LABELS construido a partir del locale activo.
  const STEP_LABELS = [
    t('auth.register.stepAccount'),
    t('auth.register.stepCompany'),
    t('auth.register.stepDocs'),
    t('auth.register.stepLegal'),
  ];
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
        // Vendedor-only: IBAN + régimen fiscal. Para compradores van undefined.
        iban: data.role === 'VENDEDOR' && data.iban
          ? data.iban.toUpperCase().replace(/\s+/g, '')
          : undefined,
        swiftBic: data.role === 'VENDEDOR' && data.swiftBic ? data.swiftBic : undefined,
        regimenFiscal: data.role === 'VENDEDOR' ? data.regimenFiscal : undefined,
      });
      setSuccess({ email: data.email });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string }; status?: number }; message?: string; code?: string };
      const message = axiosErr?.response?.data?.error
        ?? (axiosErr?.code === 'ECONNABORTED' ? t('auth.register.timeout') : null)
        ?? (axiosErr?.message ? `Error: ${axiosErr.message}` : t('auth.register.serverErrorFallback'));
      setServerError(message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-card rounded-2xl shadow-soft-md border border-border/50 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{t('auth.register.successTitle')}</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {t('auth.register.successDesc')}
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('auth.register.labelEmail')}</span>
                <span className="font-medium text-foreground">{success.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('auth.register.labelPassword')}</span>
                <span className="font-medium text-foreground">••••••••••</span>
              </div>
            </div>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full">{t('auth.register.backToLogin')}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[40%] relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative z-10 max-w-sm text-center space-y-8 animate-fade-in">
          <div className="flex justify-center animate-float">
            <LogoIcon size={64} color="#D4A817" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground leading-tight">
              {t('auth.register.heroTitle')}
            </h2>
            <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {t('auth.register.heroDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-background">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <Logo variant="small" width={140} />
            </div>
            <p className="text-muted-foreground text-sm">{t('auth.register.tagline')}</p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {t('auth.register.stepOf').replace('{n}', String(currentStep))}
              </span>
              <span className="text-xs font-medium text-foreground">{STEP_LABELS[currentStep - 1]}</span>
            </div>
            <Progress value={(currentStep / 4) * 100} className="h-1.5" />
          </div>

          <div className="bg-card rounded-2xl shadow-soft-md border border-border/50 p-8">
            <StepProgress currentStep={currentStep} totalSteps={4} stepLabels={STEP_LABELS} />

            {serverError && (
              <div role="alert" className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{serverError}</span>
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

            <p className="text-center text-sm text-muted-foreground mt-6">
              {t('auth.register.haveAccount')}{' '}
              <Link href="/login" className="font-semibold text-foreground hover:text-primary transition-colors">{t('auth.register.signIn')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
