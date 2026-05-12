'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { buscarDocumentoSunat } from '@/server/actions/clientes-validacion';
import type { DatosSunat } from '@/lib/sunat/consultar-documento';

interface Props {
  tipo: 'RUC' | 'DNI';
  onResultado: (data: DatosSunat) => void;
  onNumeroChange?: (numero: string) => void;
}

export function DocAutocomplete({ tipo, onResultado, onNumeroChange }: Props) {
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxLen = tipo === 'RUC' ? 11 : 8;

  const buscar = async () => {
    const limpio = numero.replace(/\D/g, '');
    if (limpio.length !== maxLen) return;

    setLoading(true);
    setError(null);
    const res = await buscarDocumentoSunat(tipo, limpio);
    setLoading(false);

    if (res.success) {
      onResultado(res.data);
    } else {
      setError(res.error);
    }
  };

  const handleChange = (v: string) => {
    const limpio = v.replace(/\D/g, '').slice(0, maxLen);
    setNumero(limpio);
    setError(null);
    onNumeroChange?.(limpio);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscar();
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor="numero-doc">Número de {tipo}</Label>
      <div className="flex gap-2">
        <Input
          id="numero-doc"
          value={numero}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tipo === 'RUC' ? '20xxxxxxxxx' : '0xxxxxxx'}
          maxLength={maxLen}
          className="font-mono"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={buscar}
          disabled={loading || numero.replace(/\D/g, '').length !== maxLen}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
