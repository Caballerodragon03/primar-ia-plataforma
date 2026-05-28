'use client';

/**
 * Phase 15 — Página explicativa pública del sistema de comisiones.
 *
 * Enlazada desde las tablas de planes (PlanCard → "(ver más)" al lado de
 * la línea de comisión). Resume:
 *   1. Quién paga (el comprador).
 *   2. Tabla por ticket (5% → 2% según importe).
 *   3. Descuentos por plan de suscripción (LONJA −0,5pp, CENTRAL −1,0pp).
 *   4. Descuentos por volumen mensual confirmado (−0,1pp / −0,2pp / −0,3pp).
 *   5. Caps (mín 5 €, máx 5 000 €).
 *
 * Los valores reflejan EXACTAMENTE lo implementado en
 * packages/shared/src/commission.ts. Si se tocan ahí, hay que
 * actualizar también esta página.
 */
import Link from 'next/link';
import { ArrowLeft, Receipt, BadgePercent, TrendingDown, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { useT } from '@/lib/i18n/LocaleProvider';

export default function CommissionsPage() {
  const t = useT();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="small" width={120} />
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('commissions.back')}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-10">
        <section>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {t('commissions.title')}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {t('commissions.intro')}
          </p>
        </section>

        {/* Who pays */}
        <section className="bg-card border border-border rounded-card p-6 sm:p-8 shadow-soft">
          <div className="flex items-start gap-3 mb-3">
            <Receipt className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <h2 className="text-xl font-semibold text-foreground">{t('commissions.whoPays.title')}</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-9">
            {t('commissions.whoPays.body')}
          </p>
        </section>

        {/* Base tiers */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <BadgePercent className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {t('commissions.baseTiers.title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('commissions.baseTiers.desc')}
          </p>
          <div className="overflow-x-auto rounded-card border border-border shadow-soft">
            <table className="w-full text-sm bg-card">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('commissions.baseTiers.colTicket')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('commissions.baseTiers.colPct')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 text-foreground">{'< 500 €'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">5,0 %</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">500 € – 2 000 €</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">4,0 %</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">2 000 € – 10 000 €</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">3,0 %</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">10 000 € – 50 000 €</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">2,5 %</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">{'> 50 000 €'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">2,0 %</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Subscription discount */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {t('commissions.planDiscount.title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('commissions.planDiscount.desc')}
          </p>
          <div className="overflow-x-auto rounded-card border border-border shadow-soft">
            <table className="w-full text-sm bg-card">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('commissions.planDiscount.colPlan')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('commissions.planDiscount.colDiscount')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 text-foreground">Mercado (free)</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">0 pp</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">Lonja</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">−0,5 pp</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">Central</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">−1,0 pp</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Volume discount */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {t('commissions.volumeDiscount.title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('commissions.volumeDiscount.desc')}
          </p>
          <div className="overflow-x-auto rounded-card border border-border shadow-soft">
            <table className="w-full text-sm bg-card">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('commissions.volumeDiscount.colVolume')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('commissions.volumeDiscount.colDiscount')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 text-foreground">{'< 25 000 €'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">0 pp</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">25 000 € – 100 000 €</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">−0,1 pp</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">100 000 € – 500 000 €</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">−0,2 pp</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-foreground">{'> 500 000 €'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">−0,3 pp</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Caps */}
        <section className="bg-card border border-border rounded-card p-6 sm:p-8 shadow-soft">
          <div className="flex items-start gap-3 mb-3">
            <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <h2 className="text-xl font-semibold text-foreground">{t('commissions.caps.title')}</h2>
          </div>
          <ul className="pl-9 space-y-2 text-sm text-muted-foreground">
            <li>• {t('commissions.caps.min')}</li>
            <li>• {t('commissions.caps.max')}</li>
            <li>• {t('commissions.caps.floor')}</li>
          </ul>
        </section>

        {/* Example */}
        <section className="bg-amber-50 border border-amber-200 rounded-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            {t('commissions.example.title')}
          </h2>
          <div className="text-sm text-foreground space-y-2 leading-relaxed">
            <p>{t('commissions.example.line1')}</p>
            <p>{t('commissions.example.line2')}</p>
            <p>{t('commissions.example.line3')}</p>
            <p className="font-semibold pt-2 border-t border-amber-300/50">
              {t('commissions.example.total')}
            </p>
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center pt-2">
          {t('commissions.footer')}
        </p>
      </main>
    </div>
  );
}
