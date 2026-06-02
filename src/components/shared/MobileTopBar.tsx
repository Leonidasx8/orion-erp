'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

interface Props {
  logo: React.ReactNode;
  drawerSidebar: React.ReactNode;
}

export function MobileTopBar({ logo, drawerSidebar }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cierra el drawer automáticamente cuando el usuario navega
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Barra superior fija en móvil */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-3 border-b border-orion-border bg-orion-bg px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="grid h-8 w-8 place-items-center rounded-md text-orion-fg-muted hover:bg-orion-bg-subtle hover:text-orion-fg"
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>
        {logo}
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto bg-orion-bg shadow-xl transition-transform duration-200 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-orion-border px-4">
          {logo}
          <button
            onClick={() => setOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-md text-orion-fg-muted hover:bg-orion-bg-subtle hover:text-orion-fg"
            aria-label="Cerrar menú"
          >
            <X size={16} />
          </button>
        </div>
        {drawerSidebar}
      </div>
    </>
  );
}
