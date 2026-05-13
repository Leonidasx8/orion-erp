'use client';

import { WizardProgress } from './WizardProgress';
import { WizardStep1Datos } from './WizardStep1Datos';
import { WizardStep2Branding } from './WizardStep2Branding';
import { WizardStep3Admin } from './WizardStep3Admin';
import { WizardStep4Fiscal } from './WizardStep4Fiscal';
import { WizardStep5Plan } from './WizardStep5Plan';
import { useWizard } from '../_state/wizard-state';

const STEP_TITLES = [
  { title: 'Datos del tenant', sub: 'Información fiscal y URL de acceso' },
  { title: 'Branding', sub: 'Logo, colores y apariencia' },
  { title: 'Administrador', sub: 'Primer usuario superadmin del tenant' },
  { title: 'Configuración fiscal', sub: 'Series SUNAT y credenciales NUBEFACT' },
  { title: 'Plan', sub: 'Elige el plan de facturación' },
];

export function WizardContent() {
  const { currentStep } = useWizard();
  const { title, sub } = STEP_TITLES[currentStep - 1] ?? STEP_TITLES[0];

  return (
    <div className="space-y-5">
      <WizardProgress />
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
      {currentStep === 1 && <WizardStep1Datos />}
      {currentStep === 2 && <WizardStep2Branding />}
      {currentStep === 3 && <WizardStep3Admin />}
      {currentStep === 4 && <WizardStep4Fiscal />}
      {currentStep === 5 && <WizardStep5Plan />}
    </div>
  );
}
