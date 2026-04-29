'use client';

import { useEffect } from 'react';
import { setPermisos } from '@/lib/auth/permissions-store';

export function PermissionsBootstrap({ permisos }: { permisos: string[] }) {
  useEffect(() => {
    setPermisos(permisos);
  }, [permisos]);
  return null;
}
