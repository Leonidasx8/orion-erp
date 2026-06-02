'use server';
import { requirePermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/auth/current-tenant';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { getReporteVentas, type FiltrosVentas } from './reportes-ventas';
import { exportToExcel } from '@/lib/excel/export-helpers';

export async function exportarVentas(filtros: FiltrosVentas) {
  await requirePermission('reportes.exportar');
  const tenant = await getCurrentTenant();

  const data = await getReporteVentas(filtros);

  const buffer = await exportToExcel({
    sheetName: 'Ventas',
    columns: [
      { header: 'Período', key: 'grupo', width: 20 },
      { header: 'N° Facturas', key: 'facturas', width: 15, format: (v) => Number(v) },
      { header: 'Total S/', key: 'total', width: 20, format: (v) => Number(Number(v).toFixed(2)) },
    ],
    rows: data as unknown as Record<string, unknown>[],
  });

  const supabase = await createServerAdminClient();

  const bucketName = 'exports';
  const path = `${tenant.id}/exports/ventas-${Date.now()}.xlsx`;

  // Intentar crear el bucket si no existe
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === bucketName) ?? false;
  if (!bucketExists) {
    const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
      public: false,
    });
    if (bucketError) throw new Error(`No se pudo crear el bucket: ${bucketError.message}`);
  }

  const { error: uploadError } = await supabase.storage.from(bucketName).upload(path, buffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { data: urlData } = await supabase.storage.from(bucketName).createSignedUrl(path, 3600);

  return { success: true as const, data: { url: urlData!.signedUrl } };
}
