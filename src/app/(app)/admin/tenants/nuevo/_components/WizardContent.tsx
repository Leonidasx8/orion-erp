'use client';

import { WizardProgress } from './WizardProgress';
import { WizardStep1Datos } from './WizardStep1Datos';
import { WizardStep2Branding } from './WizardStep2Branding';
import { WizardStep3Admin } from './WizardStep3Admin';
import { WizardStep4Fiscal } from './WizardStep4Fiscal';
import { WizardStep5Plan } from './WizardStep5Plan';
import { useWizard } from '../_state/wizard-state';

export function WizardContent() {
  const { currentStep } = useWizard();

  return (
    <>
      <WizardProgress />
      {currentStep === 1 && <WizardStep1Datos />}
      {currentStep === 2 && <WizardStep2Branding />}
      {currentStep === 3 && <WizardStep3Admin />}
      {currentStep === 4 && <WizardStep4Fiscal />}
      {currentStep === 5 && <WizardStep5Plan />}
    </>
  );
}
