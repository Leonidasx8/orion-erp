'use client';

import { create } from 'zustand';

type State = { permisos: Set<string> };

export const usePermissionsStore = create<State>(() => ({ permisos: new Set<string>() }));

export function setPermisos(permisos: string[]): void {
  usePermissionsStore.setState({ permisos: new Set(permisos) });
}
