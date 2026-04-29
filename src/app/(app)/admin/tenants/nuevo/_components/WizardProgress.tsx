'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_STEPS, useWizard } from '../_state/wizard-state';

export function WizardProgress() {
  const { currentStep } = useWizard();

  return (
    <nav aria-label="Pasos del wizard" className="mb-8">
      <ol className="flex items-center">
        {WIZARD_STEPS.map((label, idx) => {
          const step = idx + 1;
          const isDone = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <li key={step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                    isDone && 'border-primary bg-primary text-primary-foreground',
                    isCurrent && 'border-primary text-primary',
                    !isDone && !isCurrent && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isDone ? <Check className="h-4 w-4" /> : step}
                </div>
                <span
                  className={cn(
                    'text-xs',
                    isCurrent && 'font-medium text-foreground',
                    !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </div>

              {idx < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 mb-5 h-px flex-1 transition-colors',
                    isDone ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
