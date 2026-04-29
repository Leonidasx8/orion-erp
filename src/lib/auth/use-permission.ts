'use client';

import { usePermissionsStore } from './permissions-store';

export function usePermission(permiso: string): boolean {
  return usePermissionsStore((s) => s.permisos.has(permiso));
}

export function useAnyPermission(permisos: string[]): boolean {
  return usePermissionsStore((s) => permisos.some((p) => s.permisos.has(p)));
}

export function useAllPermissions(permisos: string[]): boolean {
  return usePermissionsStore((s) => permisos.every((p) => s.permisos.has(p)));
}
