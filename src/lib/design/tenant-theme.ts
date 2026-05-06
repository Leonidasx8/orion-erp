/**
 * Mapeo de tenant → clase CSS de tema (acento de color).
 * Las clases vienen de globals.css: .tenant-idex / .tenant-agro / .tenant-dignita.
 *
 * Heurística:
 *   - slug exacto coincide → ese tema
 *   - "agro*"/"verde" → agro
 *   - "dignita"/"plataforma" → dignita
 *   - default → idex (azul)
 *
 * Cuando el catálogo de tenants crezca, esto se reemplaza por una columna
 * `theme` en `tenants` (text check 'idex'|'agro'|'dignita') o similar.
 */
export type TenantTheme = 'idex' | 'agro' | 'dignita';

export function tenantThemeClass(slug: string): string {
  return `tenant-${resolveTenantTheme(slug)}`;
}

export function resolveTenantTheme(slug: string): TenantTheme {
  const s = slug.toLowerCase();
  if (s === 'idex') return 'idex';
  if (s === 'agroalves' || s.startsWith('agro')) return 'agro';
  if (s === 'dignita' || s.startsWith('plataforma')) return 'dignita';
  return 'idex';
}
