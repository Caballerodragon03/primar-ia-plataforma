'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Building2, User, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { TutorialsSection } from '@/components/tutorials/TutorialsSection';
import { LanguageToggle } from '@/components/profile/LanguageToggle';

type Tab = 'account' | 'company' | 'tutoriales';

// Phase 14L — datos de empresa del comprador. Antes la tab mostraba '—'
// literal en todos los campos por no haber fetch (igual que pasaba con el
// vendedor en 14B).
interface CompanyData {
  razonSocial: string | null;
  cifNif: string | null;
  formaJuridica: string | null;
  direccionFiscal: string | null;
  ciudad: string | null;
  codigoPostal: string | null;
  pais: string | null;
  iban: string | null;
}

// Phase 14M v3.37 — LANGUAGE_OPTIONS retirado: el viejo Select se sustituye
// por <LanguageToggle> arriba en la tab (cambio instantáneo de UI vía
// LocaleProvider + persistencia en backend idiomaPreferido).

function BuyerProfileContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'account';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Account settings state
  const [phone, setPhone] = useState('');
  // Phase 14M v3.37 — `language` retirado, ahora vive en LocaleProvider.
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Company tab state (fetched lazily on first activation)
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);

  useEffect(() => {
    if (activeTab !== 'company' || company) return;
    setLoadingCompany(true);
    api.get('/auth/profile')
      .then(({ data }) => {
        const e = data.data?.empresa as Record<string, string | null> | null;
        setCompany(e ? {
          razonSocial: e['razonSocial'] ?? null,
          cifNif: e['cifNif'] ?? null,
          formaJuridica: e['formaJuridica'] ?? null,
          direccionFiscal: e['direccionFiscal'] ?? null,
          ciudad: e['ciudad'] ?? null,
          codigoPostal: e['codigoPostal'] ?? null,
          pais: e['pais'] ?? null,
          iban: e['iban'] ?? null,
        } : null);
      })
      .catch(() => setCompany(null))
      .finally(() => setLoadingCompany(false));
  }, [activeTab, company]);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setAccountError(null);
    setAccountSuccess(false);
    try {
      // idiomaPreferido se persiste de forma independiente vía LanguageToggle.
      await api.patch('/auth/profile', { telefono: phone });
      setAccountSuccess(true);
      setTimeout(() => setAccountSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setAccountError(msg ?? 'Error al guardar los cambios.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await api.patch('/auth/profile', {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setPasswordError(msg ?? 'Error al cambiar la contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'account', label: 'Cuenta', icon: User },
    { key: 'company', label: 'Datos de empresa', icon: Building2 },
    { key: 'tutoriales', label: 'Tutoriales', icon: GraduationCap },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Perfil</h1>
        <p className="text-sm text-muted-foreground">Gestiona tu cuenta y los datos de tu empresa.</p>
      </div>

      {/* Sub-nav tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 cursor-pointer',
              activeTab === key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Account Settings */}
      {activeTab === 'account' && (
        <div className="space-y-6 animate-stagger">
          {/* Phase 14M v3.37 — toggle de idioma UI (localStorage). */}
          <LanguageToggle />
          {/* Contact info */}
          <div className="bg-card rounded-card border border-border p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Persona de contacto</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Nombre</p>
                <p className="text-sm font-medium text-foreground">
                  {user?.nombre} {user?.apellidos}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Correo</p>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <form onSubmit={handleSaveAccount} className="bg-card rounded-card border border-border p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Preferencias</h2>
            <Input
              label="Teléfono"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
            />
            {/* Phase 14M v3.37 — Select de idioma retirado; ahora vive
                en <LanguageToggle> al inicio de esta tab. */}
            {accountError && (
              <p role="alert" className="text-xs text-red-500">⚠ {accountError}</p>
            )}
            {accountSuccess && (
              <p className="text-xs text-green-600">Cambios guardados correctamente.</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={savingAccount}>
                Guardar cambios
              </Button>
            </div>
          </form>

          {/* Change password */}
          <form onSubmit={handleChangePassword} className="bg-card rounded-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Cambiar contraseña</h2>
            </div>
            <Input
              label="Contraseña actual"
              showPasswordToggle
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="Nueva contraseña"
              showPasswordToggle
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirmar nueva contraseña"
              showPasswordToggle
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              error={confirmPassword && newPassword !== confirmPassword ? 'Las contraseñas no coinciden' : undefined}
            />
            {passwordError && (
              <p role="alert" className="text-xs text-red-500">⚠ {passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-xs text-green-600">Contraseña actualizada correctamente.</p>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={savingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                Actualizar contraseña
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Company Information */}
      {activeTab === 'company' && (
        <div className="space-y-4">
          {/* Locked banner */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-card bg-yellow-50 border border-primary/30">
            <Lock className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-secondary">
              Los datos de empresa quedan bloqueados una vez verificados. Escribe a{' '}
              <a href="mailto:support@primar-ia.com" className="underline font-medium">
                support@primar-ia.com
              </a>{' '}
              para solicitar cambios.
            </p>
          </div>

          <div className="bg-card rounded-card border border-border p-6 space-y-4">
            {loadingCompany ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando…</p>
            ) : (
              [
                { label: 'Razón social', value: company?.razonSocial ?? '—' },
                { label: 'CIF / NIF', value: company?.cifNif ?? '—' },
                { label: 'Forma jurídica', value: company?.formaJuridica ?? '—' },
                { label: 'Dirección fiscal', value: company?.direccionFiscal ?? '—' },
                { label: 'Ciudad', value: company?.ciudad ?? '—' },
                { label: 'Código postal', value: company?.codigoPostal ?? '—' },
                { label: 'País', value: company?.pais ?? '—' },
                { label: 'IBAN', value: company?.iban ?? 'Gestionado de forma segura por Stripe' },
              ].map(({ label, value }) => (
                <div key={label} className="grid grid-cols-2 gap-4 py-2 border-b border-border last:border-0">
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-sm text-foreground">{value}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'tutoriales' && (
        <TutorialsSection role="COMPRADOR" />
      )}
    </div>
  );
}

export default function BuyerProfilePage() {
  return (
    <Suspense fallback={null}>
      <BuyerProfileContent />
    </Suspense>
  );
}
