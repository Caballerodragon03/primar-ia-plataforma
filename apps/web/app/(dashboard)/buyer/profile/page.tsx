'use client';
import { useState } from 'react';
import { Lock, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type Tab = 'account' | 'company';

const LANGUAGE_OPTIONS = [
  { value: 'ES', label: 'Español (ES)' },
  { value: 'EN', label: 'Inglés (EN)' },
];

export default function BuyerProfilePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('account');

  // Account settings state
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('ES');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

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
      await api.patch('/auth/profile', { telefono: phone, idiomaPreferido: language });
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
    { key: 'account', label: 'Account Settings', icon: User },
    { key: 'company', label: 'Company Information', icon: Building2 },
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
        <div className="space-y-6">
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
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
            />
            <Select
              label="Preferred Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={LANGUAGE_OPTIONS}
            />
            {accountError && (
              <p role="alert" className="text-xs text-red-500">⚠ {accountError}</p>
            )}
            {accountSuccess && (
              <p className="text-xs text-green-600">Cambios guardados correctamente.</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={savingAccount}>
                Save Changes
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
              label="Current Password"
              showPasswordToggle
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              showPasswordToggle
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm New Password"
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
                Update Password
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
              Company information is locked once verified. Contact{' '}
              <a href="mailto:support@primar-ia.com" className="underline font-medium">
                support@primar-ia.com
              </a>{' '}
              to request changes.
            </p>
          </div>

          <div className="bg-card rounded-card border border-border p-6 space-y-4">
            {[
              { label: 'Razón social', value: '—' },
              { label: 'CIF / NIF', value: '—' },
              { label: 'Forma jurídica', value: '—' },
              { label: 'Dirección', value: '—' },
              { label: 'Ciudad', value: '—' },
              { label: 'Código postal', value: '—' },
              { label: 'País', value: '—' },
              { label: 'IBAN', value: 'Gestionado de forma segura por Stripe' },
            ].map(({ label, value }) => (
              <div key={label} className="grid grid-cols-2 gap-4 py-2 border-b border-border last:border-0">
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-sm text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
