'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['VENDEDOR', 'COMPRADOR']),
});

type LoginForm = z.infer<typeof loginSchema>;

const ROLE_OPTIONS = [
  { value: 'COMPRADOR', label: 'Buyer Account' },
  { value: 'VENDEDOR', label: 'Seller Account' },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'COMPRADOR' },
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      const res = await api.post('/auth/login', data);
      const { accessToken, user } = res.data.data as { accessToken: string; user: { id: string; email: string; role: 'VENDEDOR' | 'COMPRADOR' | 'ADMIN'; estado: string; nombre: string; apellidos: string } };
      setAuth(user, accessToken);
      if (user.role === 'COMPRADOR') router.push('/buyer');
      else if (user.role === 'ADMIN') router.push('/admin/dashboard');
      else router.push('/seller');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed. Please try again.';
      setServerError(message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Primar<span className="text-primary">-IA</span>
          </h1>
          <p className="text-secondary text-sm mt-1">La lonja digital del sector primario</p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-card shadow-sm border border-border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign In</h2>

          {serverError && (
            <div role="alert" className="mb-4 p-3 rounded-input bg-red-50 border border-red-200 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <Input
              label="Corporate Email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              showPasswordToggle
              autoComplete="current-password"
              required
              error={errors.password?.message}
              {...register('password')}
            />

            <Select
              label="Account Type"
              options={ROLE_OPTIONS}
              required
              error={errors.role?.message}
              {...register('role')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-2"
            >
              Log-In
            </Button>
          </form>

          <p className="text-center text-sm text-secondary mt-6">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="font-semibold text-gray-900 hover:underline">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
