'use server';

import { requirePermission } from '@/lib/auth/require-permission';
import { consultarDocumento, type DatosSunat } from '@/lib/sunat/consultar-documento';

export async function buscarDocumentoSunat(
  tipo: 'RUC' | 'DNI',
  numero: string
): Promise<{ success: true; data: DatosSunat } | { success: false; error: string }> {
  await requirePermission('clientes.ver');

  const limpio = numero.replace(/\D/g, '');
  if (tipo === 'RUC' && limpio.length !== 11)
    return { success: false, error: 'RUC debe tener 11 dígitos' };
  if (tipo === 'DNI' && limpio.length !== 8)
    return { success: false, error: 'DNI debe tener 8 dígitos' };

  const resultado = await consultarDocumento(tipo, limpio);
  if (!resultado) return { success: false, error: 'No se encontró el documento' };

  return { success: true, data: resultado };
}
