'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

const schema = z.object({
  password: z.string().min(12, 'Minimum 12 characters'),
  confirmPassword: z.string().min(1, 'Confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      setSuccess(true);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Something went wrong. Please try again.';
      setServerError(message);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-4 p-3 rounded-input bg-red-50 border border-red-200 text-sm text-red-700">
          Invalid or missing reset token.
        </div>
        <Link href="/forgot-password" className="text-sm font-semibold text-gray-900 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mb-4 p-3 rounded-input bg-green-50 border border-green-200 text-sm text-green-700">
          Password updated successfully!
        </div>
        <Link href="/login" className="text-sm font-semibold text-gray-900 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <>
      {serverError && (
        <div role="alert" className="mb-4 p-3 rounded-input bg-red-50 border border-red-200 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Input
          label="New Password"
          showPasswordToggle
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm Password"
          showPasswordToggle
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isSubmitting}
          className="w-full mt-2"
        >
          Reset Password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Primar<span className="text-primary">-IA</span>
          </h1>
          <p className="text-secondary text-sm mt-1">La lonja digital del sector primario</p>
        </div>

        <div className="bg-surface rounded-card shadow-sm border border-border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Set New Password</h2>
          <Suspense fallback={<div className="text-center text-secondary text-sm">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
