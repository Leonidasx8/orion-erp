'use client';

import { usePermission } from '@/lib/auth/use-permission';

export function PermissionGate({
  permiso,
  children,
  fallback,
}: {
  permiso: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = usePermission(permiso);
  return allowed ? <>{children}</> : <>{fallback ?? null}</>;
}
