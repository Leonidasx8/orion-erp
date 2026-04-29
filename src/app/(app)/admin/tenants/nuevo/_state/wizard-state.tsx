'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { TenantWizardInput } from '@/lib/schemas/tenant';

type WizardData = Partial<TenantWizardInput>;

type WizardContextValue = {
  currentStep: number;
  data: WizardData;
  setData: (d: WizardData) => void;
  next: () => void;
  back: () => void;
  goTo: (step: number) => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export const WIZARD_STEPS = ['Datos', 'Branding', 'Admin', 'Fiscal', 'Plan'] as const;
export const WIZARD_TOTAL = WIZARD_STEPS.length;

export function WizardProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setDataState] = useState<WizardData>({
    colorPrimario: '#0070f3',
    colorSecundario: '#7928ca',
    plan: 'starter',
  });

  const setData = (d: WizardData) => setDataState((prev) => ({ ...prev, ...d }));
  const next = () => setCurrentStep((s) => Math.min(s + 1, WIZARD_TOTAL));
  const back = () => setCurrentStep((s) => Math.max(s - 1, 1));
  const goTo = (step: number) => setCurrentStep(step);

  return (
    <WizardContext.Provider value={{ currentStep, data, setData, next, back, goTo }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard debe usarse dentro de WizardProvider');
  return ctx;
}
