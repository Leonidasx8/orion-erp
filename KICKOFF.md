# KICKOFF — Reunión Día 1 con Lucas

> Guion estructurado para la primera reunión oficial del proyecto.
> **Duración: 105 minutos** (90 originales + 15 min de decisiones de producto que el
> plan reveló como críticas). Modalidad: presencial o videollamada (Google Meet
> recomendado para grabar).
>
> **Documentos a tener abiertos durante la reunión**:
>
> - `docs/KICKOFF-CHECKLIST-LUCAS.md` (Google Doc compartido) — formulario completo, pantalla compartida
> - `docs/IMPLEMENTATION-PLAN.md` — para mostrar roadmap si pregunta
> - `docs/PATTERNS-FROM-REFERENCES.md` — para mostrar investigación si pregunta
> - Tu IDE con `pnpm dev` corriendo (demo del setup)

## Objetivo

Al finalizar esta reunión:

1. Lucas firma el Checklist de 38 requerimientos
2. Confirmamos el dominio definitivo
3. Confirmamos el proveedor SUNAT (NUBEFACT)
4. Recibimos los primeros assets críticos (logos, catálogos)
5. Tenemos lista de usuarios iniciales con sus roles
6. Dignita confirma recepción del primer pago (50% = USD 690)
7. Cronograma firmado de común acuerdo

## Antes de la reunión (Dignita)

- [ ] Enviar **`docs/KICKOFF-CHECKLIST-LUCAS.md`** convertido a Google Doc 48h antes
  - Es el formulario completo con TODAS las preguntas (12 secciones, ~60 ítems)
  - Lucas debe pre-completar lo que pueda; en la reunión cerramos lo pendiente
- [ ] Verificar que Lucas haya marcado los ítems pre-Kickoff
- [ ] Tener abierto el Sistema Orión local con Supabase corriendo (demo del setup)
- [ ] Confirmar pago recibido en cuenta
- [ ] Tener impresos: contrato firmado, anexo I, checklist (`KICKOFF-CHECKLIST-LUCAS.md`)
- [ ] Calculadora abierta para resolver preguntas de costos
- [ ] Grabar la reunión (con consentimiento)
- [ ] Tener `docs/IMPLEMENTATION-PLAN.md` y `docs/PATTERNS-FROM-REFERENCES.md` abiertos
      por si Lucas quiere ver detalle técnico

## Agenda minuto a minuto

### 00:00–00:05 · Bienvenida + objetivos (5 min)

> "Lucas, gracias por confirmar la reunión. Hoy tenemos 90 minutos. Mi objetivo es que al final tengamos: firma del checklist, primeros assets en mis manos, y tu confirmación de los proveedores externos (NUBEFACT y dominio). Si algo se nos acaba el tiempo, lo dejamos por escrito por WhatsApp/email, pero idealmente cerramos todo hoy."

### 00:05–00:15 · Recap del proyecto (10 min)

Recordá las claves:

- 33 días contractuales (cláusula 4.1), pero internamente trabajamos 7 semanas para entregar bulletproof
- 11 módulos (B.1 a B.11) + 1 módulo nuevo (B.0 plataforma multi-tenant)
- Stack: Next.js + Supabase + Vercel — todo cloud, no infra que mantener
- Garantía de 30 días post-Go-Live
- Soporte continuado: contrato separado (Anexo II)

Mostrá rápido el setup local corriendo en tu mac (3 minutos máx). Esto da confianza visual.

### 00:15–00:35 · Walkthrough del Checklist (20 min)

Pantalla compartida con el Google Doc del Checklist.

Sección por sección, Lucas marca ítems entregados:

**A. Documentación legal y fiscal** — 5 ítems

- Pedile que abra SOL ahora y mostrá los datos en pantalla compartida
- Si alguno no está listo: definir fecha tope

**B. Branding** — 5 ítems

- Pedile que envíe logos a un drive compartido AHORA mismo
- Validá visualmente que sean SVG o PNG alta resolución
- Si solo hay PDFs viejos del logo: pídelo a su diseñador

**C. Catálogos** — 6 ítems

- ¿Recibimos el Excel de Idex? OK
- **¿Recibimos el de Agroalves?** Si NO: bloqueante, pedirlo
- Confirmar política de margen mínimo (escribilo en el Doc)
- Confirmar política de tipo de cambio

**D. Clientes** — 3 ítems

- Definir fecha de entrega del Excel histórico de clientes
- Confirmar formato esperado

**E. Configuración técnica** — 4 ítems

- ⚠️ **DOMINIO**: gran momento de decisión — ver siguiente bloque

**F. Operaciones** — 5 ítems

- Persona contacto principal: ¿Lucas mismo o alguien delegado?
- Lista de usuarios iniciales

**G. Guías** — 3 ítems

- Información de transportistas y direcciones

**H. Pago** — 2 ítems

- Confirmar pago recibido
- Datos de facturación de Dignita

**I. Decisiones de producto** — 5 ítems

- Walkthrough de las decisiones pendientes

### 00:35–00:50 · Decisión clave: dominio (15 min)

Mostrale las 3 opciones que tenemos:

| Opción                                        | Costo          | Pros                                                       | Contras                                   |
| --------------------------------------------- | -------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `getorion.app`                                | USD 15/año     | Marca neutra escalable, HTTPS forzado, Cloudflare al costo | Marca de Dignita, no de Idex              |
| `orionerp.pe`                                 | S/ 110-200/año | Identidad peruana, profesional                             | Más caro, atado a Perú                    |
| Subdominio Idex (ej. `sistema.grupoidex.com`) | gratis         | Marca del cliente                                          | Lucas debe coordinar DNS con su proveedor |

Mi recomendación: `getorion.app` (Cloudflare Registrar) por escalabilidad.

Decisión confirmada por Lucas: ********\_\_\_\_********

### 00:50–01:05 · Decisión clave: NUBEFACT (10 min) — REDUCIDO

> **Cambio respecto a la versión anterior**: este bloque baja a 10 min porque
> agregamos el bloque "Decisiones de producto" abajo (15 min). NUBEFACT puede
> compartir tiempo con la firma del cuestionario al final.

Mostrá la tabla del checklist. Argumentos:

- Triple certificación (PSE+OSE+ISO 27001)
- 5 años de almacenamiento CDR en AWS (cumple SUNAT)
- Sin homologación SUNAT requerida (ahorramos 7-10 días)
- Costo: ~S/ 70/mes por empresa = S/ 140/mes total
- El cliente lo paga directo a NUBEFACT (no pasa por Dignita)

**Acción concreta hoy**:

- Lucas crea la cuenta en NUBEFACT para Idex
- Lucas crea la cuenta en NUBEFACT para Agroalves
- Mientras estamos en reunión: nos da las RUTAs y TOKENs si ya las tiene
- Si no: deadline para entrega = Día 16

### 01:00–01:15 · Decisiones de producto críticas (15 min) — NUEVO

> Sin estas decisiones, los módulos B.4 (Catálogo), B.5 (Cotizaciones), B.7 (Kardex),
> B.9 (Facturación) y B.10 (Crédito) quedan parcialmente bloqueados. Resolverlas
> hoy = ahorro de 4-8h en re-trabajo + 1 ida-vuelta de aclaraciones.
>
> **Pantalla compartida**: abrir `docs/KICKOFF-CHECKLIST-LUCAS.md` sección "I.
> Decisiones de producto" y resolver de a una. Cada decisión tiene una
> recomendación marcada como [D] — si Lucas confía, puede aceptar la default.

**Inventario y Kardex (3 min)**

- Costo promedio vs FIFO → recomendación: **costo promedio**
- ¿Permite stock negativo? → recomendación: **NO, bloquear**
- Multi-warehouse → recomendación: **uno solo** (Idex tiene 1 almacén central)

**Crédito y cobranzas (4 min)**

- Plazo crédito default → 30 días para clientes nuevos
- Pago en moneda distinta → tipo cambio del DÍA del pago (SUNAT TC)
- Pago mayor al saldo → **rechazar**, error claro
- Exceder línea crédito → **bloquear automáticamente** la nueva factura

**Cotizaciones (3 min)**

- Validez → **15 días**
- Descuento Comerciales → hasta 5% sin aprobación
- Margen mínimo → **bloqueante** (no permite emitir)
- Email automático al enviar → **NO en v1**, manual

**Catálogo (2 min)**

- Productos descatalogados → solo flag, mantener histórico
- ¿Quién ve precio compra? → Superadmin + Facturación
- ¿Quién edita margen mínimo? → solo Superadmin

**SUNAT (3 min)**

- Series adicionales → solo F001/B001 (a menos que Lucas confirme otra sucursal)
- ¿Quién anula factura? → solo Superadmin
- NC parcial en v1 → **NO**, solo NC totales

**TODAS las decisiones quedan registradas en el Google Doc del checklist.**

### 01:15–01:25 · Lista de usuarios iniciales (10 min)

Pantalla con un Google Sheet:

| #   | Nombre        | Email     | Empresa          | Rol                |
| --- | ------------- | --------- | ---------------- | ------------------ |
| 1   | Lucas Escrivá | lucas@... | Idex y Agroalves | Superadmin (ambas) |
| 2   | ...           | ...       | Idex             | Comercial          |
| 3   | ...           | ...       | Idex             | Facturación        |
| ... |               |           |                  |                    |

Mínimo a definir hoy: 4 usuarios para Idex y 2 para Agroalves.

### 01:25–01:35 · Próximos pasos (10 min)

Cronograma de las siguientes 2 semanas (mostrarlo en pantalla):

```
SEMANA 1
  Día 1 (HOY): Kickoff + assets críticos
  Día 2: Setup repo + Supabase staging + dominio configurado
  Día 3: Design System (Claude Design + sesión con Lucas para validar visual)
  Día 4: Esquema DB completo (tenants, users, roles, productos, clientes)
  Día 5: Demo #1 — Lucas valida estructura, branding, login funcionando

SEMANA 2
  Días 6-9: Módulos B.0 (tenants), B.1 (multi-empresa), B.2 (auth/roles)
  Día 10: Demo #2 — Crear tenant, gestionar usuarios y permisos
```

Próximas reuniones programadas:

- Demo #1: Día 5 (mismo horario)
- Demo #2: Día 10
- Demos posteriores: cada 5 días hábiles

### 01:35–01:45 · Firma + cierre (10 min)

- Lucas firma el Checklist (DocuSign en pantalla o impreso)
- Confirmamos que el primer pago (USD 690) está acreditado
- Subir el checklist firmado al Drive compartido
- Stop a la grabación
- WhatsApp grupo `#orion-erp-dignita-idex` para coordinación rápida

## Después de la reunión (mismo día)

- [ ] Subir checklist firmado al Drive
- [ ] Subir grabación de la reunión al Drive
- [ ] Crear Google Sheet "Tracker Orión" con los 38 ítems + estado actualizado
- [ ] Ejecutar `setup-orion.sh` para crear el repo + setup base
- [ ] Comprar el dominio elegido
- [ ] Crear proyectos Supabase staging + production
- [ ] Crear cuenta Sentry, Resend, Vercel proyecto
- [ ] Configurar GitHub Secrets (paso 6 del setup script)
- [ ] Enviar email de resumen a Lucas con next actions de él

## Plantilla email de cierre

```
Asunto: [Orión] Resumen Kickoff y próximos pasos

Lucas,

Gracias por la reunión de hoy. Acá el resumen y los compromisos que cerramos:

✅ Confirmado:
- Dominio: <dominio>
- Proveedor SUNAT: NUBEFACT
- Persona contacto principal: <nombre>
- Pago primera cuota: recibido

📋 Pendiente de tu lado (próximos 5 días):
- Excel de Agroalves (catálogo)
- Lista de clientes históricos
- Logos en alta resolución de ambas empresas
- Cuentas NUBEFACT activadas con RUTA + TOKEN

🚀 Pendiente de mi lado (próximos 5 días):
- Setup técnico completo (repo, Supabase, Vercel)
- Configuración del dominio
- Demo #1 funcional para el Día 5 (login + estructura base)

📅 Próxima reunión: <fecha Demo #1>

El checklist firmado está en el Drive compartido, junto con la grabación.

Cualquier consulta, WhatsApp.

Leonidas
Dignita.tech
```
