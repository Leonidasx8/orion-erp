'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { guardarConfigSunat, probarConexionSunat } from '@/server/actions/configuracion-sunat';

interface Props {
  rutaActual: string;
  tokenConfigurado: boolean;
}

type PruebaEstado = { tipo: 'ok' | 'error'; mensaje: string } | null;

export function ConfigSunatForm({ rutaActual, tokenConfigurado }: Props) {
  const [ruta, setRuta] = useState(rutaActual);
  const [token, setToken] = useState('');
  const [prueba, setPrueba] = useState<PruebaEstado>(null);
  const [probando, setProbando] = useState(false);
  const [guardando, startGuardar] = useTransition();

  const sinDatos = ruta.trim().length === 0 || token.trim().length === 0;

  const onProbar = async () => {
    setProbando(true);
    setPrueba(null);
    const res = await probarConexionSunat({ ruta, token });
    setProbando(false);
    if (res.success) {
      setPrueba({ tipo: 'ok', mensaje: res.mensaje });
    } else {
      setPrueba({ tipo: 'error', mensaje: res.error });
    }
  };

  const onGuardar = () => {
    startGuardar(async () => {
      const res = await guardarConfigSunat({ ruta, token });
      if (res.success) {
        toast.success('Credenciales de facturación guardadas');
        setToken('');
        setPrueba(null);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6 rounded-lg border p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Facturación electrónica (Nubefact)</h2>
        <p className="text-sm text-muted-foreground">
          Pega la <strong>ruta</strong> y el <strong>token</strong> de tu cuenta Nubefact. Una vez
          guardados y probados, el sistema emitirá automáticamente tus comprobantes a SUNAT.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ruta">Ruta (URL o identificador)</Label>
        <Input
          id="ruta"
          value={ruta}
          onChange={(e) => {
            setRuta(e.target.value);
            setPrueba(null);
          }}
          placeholder="https://api.nubefact.com/api/v1/xxxxxxxx-xxxx-…"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Puedes pegar la URL completa; el sistema extrae el identificador automáticamente.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="token">Token</Label>
        <Input
          id="token"
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setPrueba(null);
          }}
          placeholder={
            tokenConfigurado
              ? '•••••••• (ya configurado — escribe para reemplazar)'
              : 'Pega tu token de Nubefact'
          }
          autoComplete="off"
        />
        {tokenConfigurado && (
          <p className="text-xs text-muted-foreground">
            Ya hay un token guardado. Déjalo en blanco para conservarlo, o escribe uno nuevo para
            reemplazarlo.
          </p>
        )}
      </div>

      {prueba && (
        <div
          className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
            prueba.tipo === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {prueba.tipo === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{prueba.mensaje}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onProbar} disabled={sinDatos || probando}>
          {probando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Probar conexión
        </Button>
        <Button type="button" onClick={onGuardar} disabled={sinDatos || guardando}>
          {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar credenciales
        </Button>
      </div>
    </div>
  );
}
