'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      await api.post('/auth/forgot-password', data);
      setSent(true);
    } catch {
      setServerError('Something went wrong. Please try again.');
    }
  };

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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-secondary text-sm mb-6">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>

          {sent ? (
            <div className="text-center">
              <div className="mb-4 p-3 rounded-input bg-green-50 border border-green-200 text-sm text-green-700">
                If an account with that email exists, you&apos;ll receive a reset link shortly.
              </div>
              <Link href="/login" className="text-sm font-semibold text-gray-900 hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <div role="alert" className="mb-4 p-3 rounded-input bg-red-50 border border-red-200 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  className="w-full mt-2"
                >
                  Send Reset Link
                </Button>
              </form>

              <p className="text-center text-sm text-secondary mt-6">
                <Link href="/login" className="font-semibold text-gray-900 hover:underline">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
