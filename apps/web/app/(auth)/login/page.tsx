'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Logo } from '@/components/brand/Logo';
import { LogoIcon } from '@/components/brand/LogoIcon';

const loginSchema = z.object({
  email: z.string().email('Email no válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {},
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
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al iniciar sesión. Inténtalo de nuevo.';
      setServerError(message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative z-10 max-w-md text-center space-y-8 animate-fade-in">
          <div className="flex justify-center animate-float">
            <LogoIcon size={80} color="#D4A817" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground leading-tight">
              La revolución del campo<br />empieza contigo.
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed">
              Conecta directamente con productores y compradores del sector primario en España. Sin intermediarios.
            </p>
          </div>
          <div className="flex items-center justify-center gap-8 pt-4 animate-stagger">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">101+</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-registros</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">B2B</p>
              <p className="text-xs text-muted-foreground mt-0.5">Marketplace</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">0%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Comisión vendedor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-background">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Logo (mobile + desktop) */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Logo variant="small" width={160} />
            </div>
            <p className="text-muted-foreground text-sm">La lonja digital del sector primario</p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-2xl shadow-soft-md border border-border/50 p-8">
            <h2 className="text-xl font-semibold text-foreground mb-1">Bienvenido de vuelta</h2>
            <p className="text-sm text-muted-foreground mb-6">Inicia sesión en tu cuenta</p>

            {serverError && (
              <div role="alert" className="mb-5 flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <Input
                label="Email corporativo"
                type="email"
                placeholder="tu@empresa.com"
                autoComplete="email"
                required
                error={errors.email?.message}
                {...register('email')}
              />

              <div>
                <Input
                  label="Contraseña"
                  showPasswordToggle
                  autoComplete="current-password"
                  required
                  error={errors.password?.message}
                  {...register('password')}
                />
                <div className="text-right mt-1.5">
                  <Link href="/forgot-password" className="text-sm text-primary-dark hover:text-primary/80 transition-colors font-medium">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full mt-2 shadow-soft hover:shadow-soft-md"
              >
                Iniciar sesión
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">o</span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{' '}
              <Link href="/register" className="font-semibold text-foreground hover:text-primary transition-colors">
                Regístrate ahora
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Respaldado por Santander X Explorer y ESIC Emprendedores
          </p>
        </div>
      </div>
    </div>
  );
}
