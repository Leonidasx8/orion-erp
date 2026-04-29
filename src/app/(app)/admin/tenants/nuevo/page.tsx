import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WizardProvider } from './_state/wizard-state';
import { WizardContent } from './_components/WizardContent';

export const metadata = { title: 'Nuevo tenant — Dignita' };

export default function NuevoTenantPage() {
  return (
    <WizardProvider>
      <div className="p-6">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Crear tenant</CardTitle>
          </CardHeader>
          <CardContent>
            <WizardContent />
          </CardContent>
        </Card>
      </div>
    </WizardProvider>
  );
}
