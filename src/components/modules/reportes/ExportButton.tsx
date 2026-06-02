'use client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function ExportButton({
  exportFn,
  label = 'Exportar Excel',
}: {
  exportFn: () => Promise<{ success: boolean; data?: { url: string } }>;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await exportFn();
      if (res.success && res.data?.url) {
        const a = document.createElement('a');
        a.href = res.data.url;
        a.download = '';
        a.click();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline" size="sm">
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
