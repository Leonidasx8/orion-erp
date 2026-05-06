# Aprobación — Bundle Claude Design Sistema Orion V1

**Fecha:** 2026-05-05
**Aprobado por:** Lucas Yauri (stakeholder)
**Versión:** V1 Slate (neutral con acento por tenant)
**Bundle origen:** Claude Design — `Sistema Orion`

## Alcance aprobado

| Carpeta              | Cobertura                                              | Notas                                          |
| -------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| `_system/`           | Tokens, componentes, patrones                          | Canónico — toda UI del proyecto deriva de aquí |
| `_admin/`            | Login/MFA, dashboard plataforma, dashboard tenant      | B.0/B.1/B.2                                    |
| `b3-clientes/`       | Lista + nuevo (4 estados RUC SUNAT) + detalle 360°     | B.3                                            |
| `b4-productos/`      | Catálogo + detalle precios + import Excel              | B.4                                            |
| `b5-cotizaciones/`   | Pipeline + builder con márgenes + detalle con timeline | B.5                                            |
| `b6-ordenes-compra/` | (vacío) **derivar del form de B.5**                    | B.6                                            |
| `b7-kardex/`         | Kardex + ajuste manual crítico (compartido con B.8)    | B.7                                            |
| `b8-guias/`          | Guía SUNAT (compartido con B.7)                        | B.8                                            |
| `b9-facturas/`       | Lista + nueva con validación + detalle rechazada       | B.9                                            |
| `b10-credito/`       | Aging report + usuarios + roles matrix + config tenant | B.10 + admin                                   |
| `equipo-actividad/`  | (vacío) **módulo nuevo simple**                        | Pendiente — derivar de detalle 360° clientes   |

## Diferencias con la regla anterior

Antes: gate de Claude Design por módulo con `APPROVED.md` por carpeta. Ahora: **una sola aprobación global** que abre toda la UI del proyecto. Los archivos `.jsx` en `docs/design/` son referencia visual; la implementación real es shadcn + Tailwind en `src/`.

## Reglas vigentes

1. UI nueva debe seguir tokens del V1 (`docs/design/_system/styles.css` → traducidos a `globals.css` + `tailwind.config.ts`).
2. Pantallas de un módulo se modelan a partir del archivo `.jsx` de su carpeta. Si no hay (B.6 órdenes compra, equipo-actividad), se deriva del módulo más cercano siguiendo los patrones del design system.
3. Para pantallas no triviales (KardexTimeline, builder de cotizaciones, PDF templates) se muestra screenshot/diff antes de commitear.
4. Submódulos faltantes (estados empty/loading/error completos, modales secundarios, B.11 reportes) se derivan siguiendo patrones del design system. Si surge una decisión visual no obvia, se consulta antes.

## Pendientes derivados de la aprobación

- [ ] Traducir tokens `styles.css` → `src/app/globals.css`
- [ ] Cargar Inter + JetBrains Mono (`next/font/google`)
- [ ] Wrapper de tenant theming (`.tenant-idex` / `.tenant-agro` / `.tenant-dignita`)
- [ ] Construir módulo nuevo "Actividad por miembro de equipo" (simple — listado + detalle por usuario con tabs: clientes agregados, cotizaciones, facturas, actividad reciente)
