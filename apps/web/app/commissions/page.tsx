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
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt, BadgePercent, TrendingDown, ShieldCheck, Calculator } from 'lucide-react';
import { calcularComision, type BuyerSubscriptionTier } from '@primaria/shared';
import { Logo } from '@/components/brand/Logo';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';

const PLAN_TIERS: Array<{ id: 'MERCADO' | 'LONJA' | 'CENTRAL'; tier: BuyerSubscriptionTier; nameKey: 'plan.buyer.mercado.name' | 'plan.buyer.lonja.name' | 'plan.buyer.central.name' }> = [
  { id: 'MERCADO', tier: 'FREE', nameKey: 'plan.buyer.mercado.name' },
  { id: 'LONJA',   tier: 'MID',  nameKey: 'plan.buyer.lonja.name' },
  { id: 'CENTRAL', tier: 'TOP',  nameKey: 'plan.buyer.central.name' },
];

export default function CommissionsPage() {
  const t = useT();
  const { locale } = useLocale();
  const fmt = useMemo(
    () => new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }),
    [locale],
  );
  const fmtPct = (pct: number) =>
    `${(pct * 100).toLocaleString(locale === 'en' ? 'en-GB' : 'es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} %`;

  // ─── Calculator state ────────────────────────────────────────────────
  const [amount, setAmount] = useState<number>(8000);
  const [volume, setVolume] = useState<number>(60000);

  const results = useMemo(() => {
    return PLAN_TIERS.map((p) => {
      const r = calcularComision(amount, { subscriptionTier: p.tier, monthlyVolumeEur: volume });
      return { ...p, result: r };
    });
  }, [amount, volume]);

  const mercadoTotal = results.find((r) => r.id === 'MERCADO')?.result.total ?? 0;


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

        {/* Interactive calculator */}
        <section className="bg-amber-50 border border-amber-200 rounded-card p-6 sm:p-8 shadow-soft">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {t('commissions.calc.title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            {t('commissions.calc.desc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <label className="block">
              <span className="block text-sm font-medium text-foreground mb-1.5">
                {t('commissions.calc.amountLabel')}
              </span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full pl-3 pr-9 py-2.5 border border-border rounded-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              </div>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-foreground mb-1.5">
                {t('commissions.calc.volumeLabel')}
              </span>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={volume}
                  onChange={(e) => setVolume(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full pl-3 pr-9 py-2.5 border border-border rounded-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              </div>
              <span className="block mt-1 text-xs text-muted-foreground">
                {t('commissions.calc.volumeHint')}
              </span>
            </label>
          </div>

          {/* Results: one card per plan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {results.map(({ id, tier, nameKey, result }) => {
              const isPaid = id !== 'MERCADO';
              const savings = isPaid ? Math.max(0, mercadoTotal - result.total) : 0;
              return (
                <div
                  key={id}
                  className={[
                    'rounded-card border bg-card p-4 shadow-soft transition-colors',
                    id === 'CENTRAL' ? 'border-primary ring-1 ring-primary/20' : 'border-border',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{t(nameKey)}</span>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                      {tier === 'FREE' ? t('commissions.calc.tierFree') : tier === 'MID' ? t('commissions.calc.tierMid') : t('commissions.calc.tierTop')}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>{t('commissions.calc.rowBase')}</span>
                      <span className="text-foreground">{fmtPct(result.porcentajeBase)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('commissions.calc.rowPlanDisc')}</span>
                      <span className="text-foreground">
                        {result.descuentoSuscripcion > 0 ? `−${fmtPct(result.descuentoSuscripcion)}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('commissions.calc.rowVolDisc')}</span>
                      <span className="text-foreground">
                        {result.descuentoVolumen > 0 ? `−${fmtPct(result.descuentoVolumen)}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/50">
                      <span className="font-medium text-foreground">{t('commissions.calc.rowFinalPct')}</span>
                      <span className="font-semibold text-foreground">{fmtPct(result.porcentajeFinal)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      {t('commissions.calc.rowCommission')}
                    </div>
                    <div className="text-2xl font-bold text-foreground">{fmt.format(result.total)}</div>
                    {isPaid && savings > 0 && (
                      <div className="mt-1 text-xs font-medium text-emerald-600">
                        {t('commissions.calc.savings').replace('{n}', fmt.format(savings))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            {t('commissions.calc.note')}
          </p>
        </section>

        <p className="text-xs text-muted-foreground text-center pt-2">
          {t('commissions.footer')}
        </p>
      </main>
    </div>
  );
}
