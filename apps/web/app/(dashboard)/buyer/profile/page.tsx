'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Building2, User, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { TutorialsSection } from '@/components/tutorials/TutorialsSection';
import { LanguageToggle } from '@/components/profile/LanguageToggle';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

type Tab = 'account' | 'company' | 'tutoriales';

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

function BuyerProfileContent() {
  const t = useT();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'account';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const [phone, setPhone] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

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
      await api.patch('/auth/profile', { telefono: phone });
      setAccountSuccess(true);
      setTimeout(() => setAccountSuccess(false), 3000);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setAccountError(msg ?? t('profile.saveError'));
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.password.mismatch'));
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
      setPasswordError(msg ?? t('profile.passwordError'));
    } finally {
      setSavingPassword(false);
    }
  };

  const tabs: { key: Tab; labelKey: MessageKey; icon: React.ElementType }[] = [
    { key: 'account', labelKey: 'profile.tab.account', icon: User },
    { key: 'company', labelKey: 'profile.tab.company', icon: Building2 },
    { key: 'tutoriales', labelKey: 'profile.tab.tutoriales', icon: GraduationCap },
  ];

  const companyRows: { labelKey: MessageKey; value: string }[] = [
    { labelKey: 'profile.company.razonSocial', value: company?.razonSocial ?? '—' },
    { labelKey: 'profile.company.cifNif', value: company?.cifNif ?? '—' },
    { labelKey: 'profile.company.formaJuridica', value: company?.formaJuridica ?? '—' },
    { labelKey: 'profile.company.direccionFiscal', value: company?.direccionFiscal ?? '—' },
    { labelKey: 'profile.company.ciudad', value: company?.ciudad ?? '—' },
    { labelKey: 'profile.company.codigoPostal', value: company?.codigoPostal ?? '—' },
    { labelKey: 'profile.company.pais', value: company?.pais ?? '—' },
    { labelKey: 'profile.company.iban', value: company?.iban ?? t('profile.company.ibanStripe') },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">{t('profile.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map(({ key, labelKey, icon: Icon }) => (
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
            {t(labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'account' && (
        <div className="space-y-6 animate-stagger">
          <LanguageToggle />
          <div className="bg-card rounded-card border border-border p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">{t('profile.contactPerson')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t('profile.fullName')}</p>
                <p className="text-sm font-medium text-foreground">
                  {user?.nombre} {user?.apellidos}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">{t('profile.email')}</p>
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveAccount} className="bg-card rounded-card border border-border p-6 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">{t('profile.preferences')}</h2>
            <Input
              label={t('profile.phone')}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('profile.phonePh')}
            />
            {accountError && (
              <p role="alert" className="text-xs text-red-500">⚠ {accountError}</p>
            )}
            {accountSuccess && (
              <p className="text-xs text-green-600">{t('profile.saveSuccess')}</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={savingAccount}>
                {t('profile.save')}
              </Button>
            </div>
          </form>

          <form onSubmit={handleChangePassword} className="bg-card rounded-card border border-border p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{t('profile.password.title')}</h2>
            </div>
            <Input
              label={t('profile.password.current')}
              showPasswordToggle
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label={t('profile.password.new')}
              showPasswordToggle
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label={t('profile.password.confirm')}
              showPasswordToggle
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              error={confirmPassword && newPassword !== confirmPassword ? t('profile.password.mismatch') : undefined}
            />
            {passwordError && (
              <p role="alert" className="text-xs text-red-500">⚠ {passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-xs text-green-600">{t('profile.password.success')}</p>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={savingPassword}
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                {t('profile.passwordUpdateButton')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'company' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-card bg-yellow-50 border border-primary/30">
            <Lock className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-secondary">
              {t('profile.company.lockedBanner.before')}{' '}
              <a href="mailto:support@primar-ia.com" className="underline font-medium">
                support@primar-ia.com
              </a>{' '}
              {t('profile.company.lockedBanner.after')}
            </p>
          </div>

          <div className="bg-card rounded-card border border-border p-6 space-y-4">
            {loadingCompany ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('profile.company.loading')}</p>
            ) : (
              companyRows.map(({ labelKey, value }) => (
                <div key={labelKey} className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 py-2 border-b border-border last:border-0">
                  <p className="text-xs text-muted-foreground font-medium">{t(labelKey)}</p>
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
