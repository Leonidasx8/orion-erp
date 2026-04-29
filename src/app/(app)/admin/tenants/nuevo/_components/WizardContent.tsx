'use client';

import { WizardProgress } from './WizardProgress';
import { WizardStep1Datos } from './WizardStep1Datos';
import { WizardStep2Branding } from './WizardStep2Branding';
import { useWizard } from '../_state/wizard-state';

export function WizardContent() {
  const { currentStep } = useWizard();

  return (
    <>
      <WizardProgress />
      {currentStep === 1 && <WizardStep1Datos />}
      {currentStep === 2 && <WizardStep2Branding />}
      {/* Steps 3-5 se implementan en tarea 4 */}
    </>
  );
}
