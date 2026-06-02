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
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Image
                src="/orion-logo.png"
                alt="Orion ERP"
                width={32}
                height={32}
                className="rounded-md"
              />
              <span className="text-lg font-bold tracking-tight text-white">
                Sistema <span className="text-violet-400">Orión</span>
              </span>
            </div>
            <div className="flex items-center gap-6">
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
                href="/auth/login"
                className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                Ingresar
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#0d0720] pb-24 pt-32">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-800 bg-violet-950/50 px-4 py-1 text-sm text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            ERP en la nube para PYMEs peruanas
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Gestiona tu empresa
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              sin complicaciones
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Cotizaciones, órdenes de compra, inventario y facturación SUNAT — todo integrado, desde
            cualquier lugar.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="#contacto"
              className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-violet-700"
            >
              Solicitar demo
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-6 py-3 text-base font-medium text-slate-300 transition-colors hover:border-violet-600 hover:text-white"
            >
              Ya tengo acceso
            </Link>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modulos" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold text-slate-900">¿Qué incluye?</h2>
            <p className="mt-4 text-lg text-slate-600">
              Módulos conectados entre sí para que no pierdas tiempo duplicando información.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => (
              <div
                key={mod.title}
                className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                  <mod.icon className="h-5 w-5 text-violet-600" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{mod.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{mod.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contacto" className="bg-[#0d0720] py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">¿Listo para ordenar tu empresa?</h2>
          <p className="mt-4 text-lg text-slate-400">
            Escríbenos y coordinamos una demo con tu equipo.
          </p>
          <a
            href="mailto:contacto@orion-rp.com"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-violet-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-violet-700"
          >
            Escribirnos
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image
                src="/orion-logo.png"
                alt="Orion ERP"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="text-sm font-bold text-slate-900">Sistema Orión</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500">
              <Link href="/legal/privacy" className="hover:text-slate-900">
                Privacidad
              </Link>
              <Link href="/legal/terms" className="hover:text-slate-900">
                Términos
              </Link>
            </div>
            <p className="text-sm text-slate-400">
              © 2026 Sistema Orión. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
