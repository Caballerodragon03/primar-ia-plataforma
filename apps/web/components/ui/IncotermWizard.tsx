'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';
import { getIncotermInfo, type Incoterm } from '@primaria/shared';

interface IncotermWizardProps {
  onComplete: () => void;
}

// Phase 16 — los descs ahora vienen del paquete shared (getIncotermInfo)
// localizados ES/EN. Aquí solo conservamos qué incoterms muestra el
// wizard y su scope (para la lógica de recomendación).
const WIZARD_INCOTERMS: Array<{ code: Incoterm; scope: string }> = [
  { code: 'EXW', scope: 'nacional' },
  { code: 'FCA', scope: 'ue' },
  { code: 'CPT', scope: 'ue' },
  { code: 'CIP', scope: 'ue' },
  { code: 'DAP', scope: 'intl' },
  { code: 'DPU', scope: 'intl' },
  { code: 'DDP', scope: 'intl' },
  { code: 'FOB', scope: 'mar' },
  { code: 'CIF', scope: 'mar' },
];

type QuestionDef = {
  id: string;
  textKey: MessageKey;
  options: { value: string; labelKey: MessageKey }[];
};

const QUESTIONS: QuestionDef[] = [
  {
    id: 'v1',
    textKey: 'incotermWizard.q.v1.text',
    options: [
      { value: 'nacional', labelKey: 'incotermWizard.q.v1.nacional' },
      { value: 'ue', labelKey: 'incotermWizard.q.v1.ue' },
      { value: 'extraue', labelKey: 'incotermWizard.q.v1.extraue' },
    ],
  },
  {
    id: 'v2',
    textKey: 'incotermWizard.q.v2.text',
    options: [
      { value: 'comprador', labelKey: 'incotermWizard.q.v2.comprador' },
      { value: 'vendedor', labelKey: 'incotermWizard.q.v2.vendedor' },
      { value: 'compartido', labelKey: 'incotermWizard.q.v2.compartido' },
    ],
  },
  {
    id: 'v3',
    textKey: 'incotermWizard.q.v3.text',
    options: [
      { value: 'comprador', labelKey: 'incotermWizard.q.v3.comprador' },
      { value: 'vendedor', labelKey: 'incotermWizard.q.v3.vendedor' },
      { value: 'ninguno', labelKey: 'incotermWizard.q.v3.ninguno' },
    ],
  },
  {
    id: 'v4',
    textKey: 'incotermWizard.q.v4.text',
    options: [
      { value: 'si', labelKey: 'incotermWizard.q.v4.si' },
      { value: 'no', labelKey: 'incotermWizard.q.v4.no' },
    ],
  },
  {
    id: 'v5',
    textKey: 'incotermWizard.q.v5.text',
    options: [
      { value: 'recogida', labelKey: 'incotermWizard.q.v5.recogida' },
      { value: 'entrega', labelKey: 'incotermWizard.q.v5.entrega' },
      { value: 'puerto', labelKey: 'incotermWizard.q.v5.puerto' },
    ],
  },
];

type Answers = Record<string, string>;

function getRecommendation(answers: Answers): string {
  const { v1, v2, v3, v4, v5 } = answers;
  if (v1 === 'nacional') {
    if (v2 === 'comprador') return 'EXW';
    return 'FCA';
  } else if (v1 === 'ue') {
    if (v2 === 'comprador') return 'FCA';
    if (v3 === 'vendedor') return 'CIP';
    if (v5 === 'entrega') return 'DAP';
    return 'CPT';
  } else {
    if (v4 === 'no') return 'DAP';
    if (v5 === 'recogida') return 'EXW';
    if (v3 === 'vendedor') return 'CIP';
    if (v5 === 'puerto') return 'FOB';
    return 'DAP';
  }
}

export function IncotermWizard({ onComplete }: IncotermWizardProps) {
  const t = useT();
  const { locale } = useLocale();
  // step 0 = welcome, steps 1-5 = questions, step 6 = results
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [pending, setPending] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recommendedCode, setRecommendedCode] = useState<string | null>(null);

  const currentQuestion = step >= 1 && step <= 5 ? QUESTIONS[step - 1] : null;
  const recommended = step === 6 ? recommendedCode : null;

  const handleOptionSelect = (value: string) => {
    setPending(value);
  };

  const handleNext = () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (currentQuestion && pending) {
      const newAnswers = { ...answers, [currentQuestion.id]: pending };
      setAnswers(newAnswers);
      setPending('');
      const nextStep = step + 1;
      if (nextStep === 6) {
        // Compute recommendation and only auto-select that one
        const rec = getRecommendation(newAnswers);
        setRecommendedCode(rec);
        setSelected(new Set([rec]));
      }
      setStep(nextStep);
    }
  };

  const toggleIncoterm = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    localStorage.setItem(
      'primaria_incoterms',
      JSON.stringify({ recommended: recommendedCode, selected: [...selected], done: true })
    );
    onComplete();
  };

  const progressPercent = step >= 1 && step <= 5 ? (step / 5) * 100 : step === 6 ? 100 : 0;

  return (
    <div className="min-h-screen bg-muted/50 flex flex-col items-center justify-center px-4 py-10">
      {/* Progress bar — only visible during questions and results */}
      {step > 0 && (
        <div className="w-full max-w-lg mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-secondary font-medium">
              {step <= 5 ? t('incotermWizard.progress.question').replace('{n}', String(step)) : t('incotermWizard.progress.results')}
            </span>
            <span className="text-xs text-text-secondary">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="w-full max-w-lg bg-card rounded-card border border-border shadow-soft">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="p-8 flex flex-col items-center text-center gap-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
              🌿
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-text-primary">
                {t('incotermWizard.welcome.title')}
              </h1>
              <p className="text-text-secondary text-sm leading-relaxed">
                {t('incotermWizard.welcome.desc')}
              </p>
            </div>
            <Button variant="primary" size="lg" onClick={handleNext} className="w-full">
              {t('incotermWizard.welcome.start')}
            </Button>
          </div>
        )}

        {/* Steps 1-5: Questions */}
        {step >= 1 && step <= 5 && currentQuestion && (
          <div className="p-8 space-y-6">
            <h2 className="text-lg font-semibold text-text-primary leading-snug">
              {t(currentQuestion.textKey)}
            </h2>
            <div className="space-y-2.5">
              {currentQuestion.options.map((opt) => {
                const isActive = pending === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleOptionSelect(opt.value)}
                    className={[
                      'w-full text-left px-4 py-3 rounded-card border text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-primary/10 border-primary text-text-primary ring-2 ring-primary/20'
                        : 'bg-card border-border text-text-secondary hover:border-primary hover:bg-accent/50',
                    ].join(' ')}
                  >
                    {t(opt.labelKey)}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setPending('');
                  setStep((s) => Math.max(1, s - 1));
                }}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {t('incotermWizard.prev')}
              </button>
              <Button
                variant="primary"
                disabled={!pending}
                onClick={handleNext}
              >
                {t('incotermWizard.next')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 6: Results */}
        {step === 6 && recommended && (
          <div className="p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-text-primary">{t('incotermWizard.results.title')}</h2>
              <p className="text-sm text-text-secondary">
                {t('incotermWizard.results.desc')}
              </p>
            </div>

            {/* Recommended incoterm card */}
            {(() => {
              const recInfo = getIncotermInfo(recommended as Incoterm, locale);
              return (
                <div className="rounded-card border-2 border-primary bg-primary/5 p-5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary text-foreground text-xs font-bold tracking-wide">
                      {recommended}
                    </span>
                    <span className="font-semibold text-text-primary">{recInfo.name}</span>
                    <span className="ml-auto text-xs text-primary-dark-dark font-medium">{t('incotermWizard.recommended')}</span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{recInfo.desc}</p>
                </div>
              );
            })()}

            {/* All incoterms as toggleable chips */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">
                {t('incotermWizard.results.selectOthers')}
              </p>
              <div className="flex flex-wrap gap-2">
                {WIZARD_INCOTERMS.map((inc) => {
                  const isSelected = selected.has(inc.code);
                  const isRec = inc.code === recommended;
                  const info = getIncotermInfo(inc.code, locale);
                  return (
                    <button
                      key={inc.code}
                      type="button"
                      title={info.name}
                      onClick={() => toggleIncoterm(inc.code)}
                      className={[
                        'px-3 py-1.5 rounded-badge text-sm font-medium border transition-all duration-150',
                        isSelected
                          ? isRec
                            ? 'bg-primary text-foreground border-primary'
                            : 'bg-primary/10 border-primary text-text-primary'
                          : 'bg-card border-border text-text-secondary line-through opacity-50 hover:opacity-70',
                      ].join(' ')}
                    >
                      {inc.code}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setPending('');
                  setRecommendedCode(null);
                  setStep(5);
                }}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                {t('incotermWizard.results.back')}
              </button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleConfirm}
                disabled={selected.size === 0}
              >
                {t('incotermWizard.results.confirm')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
