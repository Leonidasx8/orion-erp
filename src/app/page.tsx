import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  FileText,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Receipt,
} from 'lucide-react';

const modules = [
  {
    icon: FileText,
    title: 'Cotizaciones y ventas',
    description: 'Genera cotizaciones en PDF, apruébalas y conviértelas en órdenes en un clic.',
  },
  {
    icon: ShoppingCart,
    title: 'Órdenes de compra',
    description: 'Gestiona tus pedidos a proveedores con seguimiento de recepción parcial y total.',
  },
  {
    icon: Package,
    title: 'Inventario y Kardex',
    description: 'Control de stock en tiempo real con historial de movimientos por producto.',
  },
  {
    icon: Users,
    title: 'Clientes y proveedores',
    description: 'Directorio centralizado con RUC, contactos y condiciones comerciales.',
  },
  {
    icon: Receipt,
    title: 'Facturación SUNAT',
    description: 'Facturas y boletas electrónicas vía Nubefact, homologadas con SUNAT.',
  },
  {
    icon: BarChart3,
    title: 'Reportes y métricas',
    description: 'Dashboards de ventas, inventario y compras para tomar decisiones con datos.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-[#0d0720]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between sm:h-16">
            <div className="flex items-center gap-2">
              <Image
                src="/orion-logo.png"
                alt="Sistema Orión"
                width={28}
                height={28}
                className="rounded-md"
              />
              <span className="text-base font-bold tracking-tight text-white sm:text-lg">
                Sistema <span className="text-violet-400">Orión</span>
              </span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <a
                href="#modulos"
                className="hidden text-sm text-slate-400 transition-colors hover:text-white sm:block"
              >
                Módulos
              </a>
              <a
                href="#contacto"
                className="hidden text-sm text-slate-400 transition-colors hover:text-white sm:block"
              >
                Contacto
              </a>
              <Link
                href="/login"
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 sm:px-4 sm:py-2"
              >
                Ingresar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#0d0720] pb-16 pt-24 sm:pb-24 sm:pt-32">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-800 bg-violet-950/50 px-3 py-1 text-xs text-violet-300 sm:mb-8 sm:px-4 sm:text-sm">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
            ERP en la nube para PYMEs peruanas
          </div>
          <h1
            className="text-balance text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            Gestiona tu empresa{' '}
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              sin complicaciones
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-400 sm:mt-6 sm:max-w-2xl sm:text-lg">
            Cotizaciones, órdenes de compra, inventario y facturación SUNAT — todo integrado, desde
            cualquier lugar.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-4">
            <a
              href="#contacto"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-violet-700 sm:w-auto sm:py-3"
            >
              Solicitar demo
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 px-6 py-3.5 text-base font-medium text-slate-300 transition-colors hover:border-violet-600 hover:text-white sm:w-auto sm:py-3"
            >
              Ya tengo acceso
            </Link>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modulos" className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center sm:mb-16">
            <h2
              className="text-2xl font-bold text-slate-900 sm:text-3xl"
              style={{ textWrap: 'balance' } as React.CSSProperties}
            >
              ¿Qué incluye?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 sm:mt-4 sm:text-lg">
              Módulos conectados entre sí para que no pierdas tiempo duplicando información.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                key={mod.title}
                className="flex gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md sm:block sm:p-6"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 sm:shrink">
                  <mod.icon className="h-5 w-5 text-violet-600" />
                </div>
                <div className="sm:mt-4">
                  <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{mod.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 sm:mt-2">{mod.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contacto" className="bg-[#0d0720] py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2
            className="text-2xl font-bold text-white sm:text-3xl"
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            ¿Listo para ordenar tu empresa?
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-base text-slate-400 sm:mt-4 sm:max-w-none sm:text-lg">
            Escríbenos y coordinamos una demo con tu equipo.
          </p>
          <a
            href="mailto:contacto@orion-rp.com"
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-violet-700 sm:mt-8 sm:w-auto sm:py-3"
          >
            Escribirnos
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2">
              <Image
                src="/orion-logo.png"
                alt="Sistema Orión"
                width={22}
                height={22}
                className="rounded"
              />
              <span className="text-sm font-bold text-slate-900">Sistema Orión</span>
            </div>
            <div className="flex gap-5 text-sm text-slate-500">
              <Link href="/legal/privacy" className="hover:text-slate-900">
                Privacidad
              </Link>
              <Link href="/legal/terms" className="hover:text-slate-900">
                Términos
              </Link>
            </div>
            <p className="text-xs text-slate-400 sm:text-sm">© 2026 Sistema Orión</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
