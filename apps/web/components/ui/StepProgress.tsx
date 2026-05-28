interface StepProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  /**
   * Localized "Step X of Y" label. If not provided, falls back to English.
   */
  stepOfLabel?: string;
}

export function StepProgress({ currentStep, totalSteps, stepLabels, stepOfLabel }: StepProgressProps) {
  const progressPct = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const label = stepLabels[currentStep - 1] ?? '';
  const stepText = stepOfLabel ?? `Step ${currentStep} of ${totalSteps}`;

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-secondary uppercase tracking-wide">
          {stepText}
        </p>
        <p className="text-xs font-semibold text-foreground">{label}</p>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPct === 0 ? 8 : progressPct}%` }}
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`${stepText}: ${label}`}
        />
      </div>
      <div className="flex justify-between mt-2">
        {stepLabels.map((step, i) => (
          <div key={step} className="flex flex-col items-center gap-1">
            <div className={[
              'w-2 h-2 rounded-full transition-colors duration-300',
              i + 1 <= currentStep ? 'bg-primary' : 'bg-gray-300',
            ].join(' ')} />
            <span className={[
              'text-[11px] hidden sm:block',
              i + 1 === currentStep ? 'text-gray-800 font-semibold' : 'text-muted-foreground',
            ].join(' ')}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
