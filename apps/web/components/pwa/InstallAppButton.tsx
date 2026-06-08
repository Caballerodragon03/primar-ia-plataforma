'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, Plus, Share2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/LocaleProvider';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallAppButtonProps {
  className?: string;
  compact?: boolean;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform?.toLowerCase() ?? '';
  const touchMac = platform === 'macintel' && window.navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/.test(ua) || touchMac;
}

function isSafariBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('crios') && !ua.includes('fxios') && !ua.includes('edgios');
}

export function InstallAppButton({ className, compact = false }: InstallAppButtonProps) {
  const t = useT();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
    setIsIOS(isIOSDevice());
    setIsSafari(isSafariBrowser());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isStandalone) return null;

  async function handleInstallClick() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setInstallPrompt(null);
      return;
    }
    setShowModal(true);
  }

  const isDirectInstall = Boolean(installPrompt);

  return (
    <>
      <div
        className={cn(
          'rounded-xl border border-primary/20 bg-primary/5 p-3',
          compact ? 'mt-4' : 'mt-5',
          className,
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              {installed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Smartphone className="h-5 w-5 text-primary-dark" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {installed ? t('pwa.install.installedTitle') : t('pwa.install.title')}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {installed
                  ? t('pwa.install.installedBody')
                  : isDirectInstall
                    ? t('pwa.install.directBody')
                    : t('pwa.install.instructionsBody')}
              </p>
            </div>
          </div>
          {!installed && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleInstallClick}
              className="w-full shrink-0 border-primary/30 bg-card text-foreground hover:bg-primary/10 sm:w-auto"
            >
              <Download className="h-4 w-4" />
              <span>{t('pwa.install.button')}</span>
            </Button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-soft-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p id="install-app-title" className="text-lg font-semibold text-foreground">
                  {t('pwa.install.modalTitle')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {isIOS
                    ? t(isSafari ? 'pwa.install.iosSafariIntro' : 'pwa.install.iosOtherIntro')
                    : t('pwa.install.genericIntro')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={t('pwa.install.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="mt-5 space-y-3">
              {!isSafari && isIOS && (
                <li className="flex gap-3 rounded-lg bg-muted/50 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-sm font-semibold text-foreground">1</span>
                  <span className="text-sm leading-relaxed text-foreground">{t('pwa.install.stepSafari')}</span>
                </li>
              )}
              <li className="flex gap-3 rounded-lg bg-muted/50 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-sm font-semibold text-foreground">
                  {!isSafari && isIOS ? '2' : '1'}
                </span>
                <span className="flex min-w-0 items-center gap-2 text-sm leading-relaxed text-foreground">
                  <Share2 className="h-4 w-4 shrink-0 text-primary-dark" />
                  {isIOS ? t('pwa.install.stepShare') : t('pwa.install.stepMenu')}
                </span>
              </li>
              <li className="flex gap-3 rounded-lg bg-muted/50 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-sm font-semibold text-foreground">
                  {!isSafari && isIOS ? '3' : '2'}
                </span>
                <span className="flex min-w-0 items-center gap-2 text-sm leading-relaxed text-foreground">
                  <Plus className="h-4 w-4 shrink-0 text-primary-dark" />
                  {isIOS ? t('pwa.install.stepAddHome') : t('pwa.install.stepInstall')}
                </span>
              </li>
              <li className="flex gap-3 rounded-lg bg-muted/50 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-sm font-semibold text-foreground">
                  {!isSafari && isIOS ? '4' : '3'}
                </span>
                <span className="text-sm leading-relaxed text-foreground">{t('pwa.install.stepOpen')}</span>
              </li>
            </ol>

            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => setShowModal(false)}
              className="mt-5 w-full"
            >
              {t('pwa.install.understood')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
