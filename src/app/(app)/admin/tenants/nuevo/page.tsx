import { WizardProvider } from './_state/wizard-state';
import { WizardContent } from './_components/WizardContent';

export const metadata = { title: 'Nuevo tenant — Orión ERP' };

export default function NuevoTenantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nuevo tenant</h1>
        <p className="text-sm text-muted-foreground">Onboarding en 5 pasos</p>
      </div>
      <WizardProvider>
        <WizardContent />
      </WizardProvider>
    </div>
  );
}
