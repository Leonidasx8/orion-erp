# Checklist de Kickoff — Sistema Orión

> **Para**: Lucas Escrivá de Romaní (Grupo Idex SAC)
> **De**: Leonidas Yauri (Dignita.tech SAC)
> **Cuándo**: completar 48h antes de la reunión Día 1.
> **Cómo**: marcar ✅ lo que ya tenés listo, escribir respuestas en los espacios **`[___]`**.
> **Ítems en rojo bloqueantes**: sin esto, ese módulo no arranca.
> **Ítems en naranja**: deadline tope = Día 5 del proyecto.
> **Total**: 12 secciones, ~60 ítems.

---

## 📋 A. Documentación legal y fiscal — Idex y Agroalves

### A.1 Datos básicos de las empresas

- [ ] Razón social Idex: **`[GRUPO IDEX SAC]`** ✅ (ya confirmado)
- [ ] RUC Idex: **`[20614847370]`** ✅ (ya confirmado)
- [ ] Razón social Agroalves: **`[___]`** 🔴 bloqueante
- [ ] RUC Agroalves: **`[___]`** 🔴 bloqueante
- [ ] Dirección fiscal Idex: **`[___]`** (extraer de SOL durante la reunión)
- [ ] Ubigeo fiscal Idex (6 dígitos): **`[___]`**
- [ ] Dirección fiscal Agroalves: **`[___]`**
- [ ] Ubigeo fiscal Agroalves: **`[___]`**

### A.2 Información tributaria

- [ ] Régimen tributario Idex: ☐ General ☐ MYPE ☐ Especial
- [ ] Régimen tributario Agroalves: ☐ General ☐ MYPE ☐ Especial
- [ ] Persona contacto SUNAT (firma de comprobantes): nombre + DNI: **`[___]`**

---

## 🎨 B. Branding (visual de cada empresa)

### B.1 Idex

- [ ] Logo en **SVG** o **PNG alta resolución** ≥ 1024px (no JPG ni screenshot)
      → subir a Drive compartido antes de la reunión
- [ ] Color primario corporativo (HEX): **`[#______]`** (ej. `#0070f3`)
- [ ] Color secundario / acento (HEX): **`[#______]`**
- [ ] Favicon (ICO o PNG 64x64): ☐ tengo ☐ necesito que lo hagan

### B.2 Agroalves

- [ ] Logo: ☐ tengo ☐ tienen otro diseñador ☐ pediré uno nuevo
      → 🔴 bloqueante: si no hay logo en Día 1, no se puede crear el tenant Agroalves
- [ ] Color primario (HEX): **`[#______]`**
- [ ] Color secundario (HEX): **`[#______]`**
- [ ] Favicon: ☐ tengo ☐ necesito que lo hagan

### B.3 Identidad combinada (la plataforma "Orión")

- [ ] ¿Querés un dominio único o un subdominio por empresa?
  - ☐ `getorion.app/idex` y `getorion.app/agroalves` (path-based, default técnico)
  - ☐ `idex.algodominio.com` + `agroalves.algodominio.com` (subdominio, requiere config DNS)
  - ☐ `sistema.grupoidex.com` (sub de tu dominio existente)

---

## 📦 C. Catálogos de productos

### C.1 Idex

- [ ] Excel del catálogo entregado: ✅ (recibido — SegElectrica con 475 productos)
- [ ] ¿La columna "P. AAA" del Excel es **precio de compra** del proveedor? ☐ Sí ☐ No (explicar): **`[___]`**
- [ ] ¿La columna "P. Venta" es lista sugerida o ya con margen aplicado?: **`[___]`**
- [ ] ¿Margen mínimo aceptable de venta? %: **`[___]`** (ej. 10%)
- [ ] ¿Ese margen es por producto, por familia, o global? **`[___]`**

### C.2 Agroalves

- [ ] Excel del catálogo Agroalves: ☐ tengo ☐ pediré al proveedor ☐ necesito ayuda armarlo
      → 🟧 deadline: Día 5
- [ ] # aproximado de SKUs Agroalves: **`[___]`**

### C.3 Política de precios

- [ ] Moneda principal de venta: ☐ USD ☐ PEN
- [ ] ¿Tipo de cambio del día? Fuente:
  - ☐ SUNAT TC oficial (default recomendado)
  - ☐ BCR (Banco Central)
  - ☐ Manual ingresado por el usuario
- [ ] ¿IGV siempre 18%?: ☐ Sí ☐ Hay productos exonerados (cuáles): **`[___]`**

---

## 👥 D. Clientes históricos

- [ ] Excel con clientes existentes (RUC, razón social, contacto, dirección):
      ☐ tengo ☐ tengo en otro sistema (cuál): **`[___]`**
- [ ] # aproximado de clientes a importar: **`[___]`**
- [ ] ¿Algún cliente con condiciones especiales (descuento por volumen, lista de precios diferente)?:
      ☐ No ☐ Sí, indicar cuáles: **`[___]`**
- [ ] Para clientes con crédito: ¿tenés registro de saldo pendiente actual?:
      ☐ No ☐ Sí, en formato: **`[___]`**

---

## 🌐 E. Configuración técnica

### E.1 Dominio

- [ ] Decisión final del dominio: **`[___]`** (default: `getorion.app`)
- [ ] ¿Lucas compra él o lo compra Dignita y lo factura?:
  - ☐ Lo compra Dignita (~USD 15/año)
  - ☐ Lo compro yo y le doy acceso

### E.2 Email del sistema

- [ ] Dirección que aparecerá como "From" en emails (cotizaciones, magic links):
      ☐ `noreply@[dominio]`
      ☐ Otro: **`[___]`**
- [ ] ¿DKIM/SPF en tu dominio actual? (técnico):
  - Si Lucas no sabe, dejar a Leonidas configurar

### E.3 Backup y recuperación

- [ ] **RPO** (cuánta data podés perder ante desastre):
  - ☐ Hasta 1 hora (default Supabase Pro)
  - ☐ Hasta 24 horas
- [ ] **RTO** (cuánto podés estar caído):
  - ☐ Hasta 1 hora
  - ☐ Hasta 4 horas
  - ☐ Hasta 1 día hábil

---

## 👤 F. Usuarios y operaciones

### F.1 Persona contacto principal del proyecto (cláusula 7.4 contrato)

- [ ] ¿Quién es?: **`[Lucas Escrivá]`** (default)
- [ ] **Contacto secundario** (si Lucas está fuera del país por +3 días): nombre + email + WhatsApp:
      **`[___]`**

### F.2 Usuarios iniciales del sistema (mínimo: 4 Idex + 2 Agroalves)

| #   | Nombre completo | Email       | Empresa            | Rol                                    |
| --- | --------------- | ----------- | ------------------ | -------------------------------------- |
| 1   | Lucas Escrivá   | `lucas@___` | Idex y Agroalves   | Superadmin (ambas)                     |
| 2   | **`[___]`**     | `[___]`     | ☐ Idex ☐ Agroalves | ☐ Superadmin ☐ Comercial ☐ Facturación |
| 3   | **`[___]`**     | `[___]`     | ☐ Idex ☐ Agroalves | ☐ Superadmin ☐ Comercial ☐ Facturación |
| 4   | **`[___]`**     | `[___]`     | ☐ Idex ☐ Agroalves | ☐ Superadmin ☐ Comercial ☐ Facturación |
| 5   | **`[___]`**     | `[___]`     | ☐ Idex ☐ Agroalves | ☐ Superadmin ☐ Comercial ☐ Facturación |
| 6   | **`[___]`**     | `[___]`     | ☐ Idex ☐ Agroalves | ☐ Superadmin ☐ Comercial ☐ Facturación |

### F.3 Capacitación

- [ ] # personas a capacitar: **`[___]`**
- [ ] Modalidad: ☐ Presencial (en oficina Idex) ☐ Remota (Google Meet)
- [ ] Horas total: **`[___]`** (default: 4h Superadmin + 2h por rol operativo)
- [ ] ¿Querés grabaciones para futuro onboarding?: ☐ Sí ☐ No

---

## 🚚 G. Guías de remisión (Módulo B.8 — bloqueante)

### G.1 Transportistas habituales (modalidad pública)

| RUC         | Razón social | Nro registro MTC | ¿Activo? |
| ----------- | ------------ | ---------------- | -------- |
| **`[___]`** | **`[___]`**  | **`[___]`**      | ☐ Sí     |
| **`[___]`** | **`[___]`**  | **`[___]`**      | ☐ Sí     |

→ Si modalidad **siempre privada** (vehículos propios), saltar a G.2.

### G.2 Vehículos propios (modalidad privada)

| Placa       | Marca / Modelo | Capacidad (kg) | Configuración (T1S2 / etc.) |
| ----------- | -------------- | -------------- | --------------------------- |
| **`[___]`** | **`[___]`**    | **`[___]`**    | **`[___]`**                 |
| **`[___]`** | **`[___]`**    | **`[___]`**    | **`[___]`**                 |

### G.3 Direcciones de partida/origen

- [ ] ¿Tenés un único almacén o varios?: **`[___]`**
- [ ] Dirección principal (saldrán las guías desde acá):
  - Dirección: **`[___]`**
  - Ubigeo (6 dígitos): **`[___]`**

---

## 💰 H. Pagos a Dignita

- [ ] Primer pago (50% = USD 690): ☐ enviado ☐ confirmar antes del Kickoff
- [ ] Datos de facturación de Dignita.tech SAC:
  - RUC: **`20609709201`**
  - Email facturación: **`[___]`**
- [ ] Segunda cuota (50% al Go-Live): se factura al activar producción

---

## ⚙️ I. Decisiones de producto (CRÍTICAS — sin estas, los módulos quedan bloqueados)

> Para cada decisión hay una recomendación marcada como **[D]**. Si Lucas confía, puede aceptar la recomendación con un ✅. Si quiere otra cosa, marcarla.

### I.1 Inventario y Kardex (módulo B.7)

**¿Cómo se calcula el costo de un producto que está en stock?**

- ☐ **Costo promedio ponderado** [D] — más simple, fácil de explicar al equipo
- ☐ FIFO (primero que entra, primero que sale) — más exacto pero más complejo

**¿El sistema permite vender un producto sin tener stock? (genera stock negativo)**

- ☐ **NO, bloquear venta** [D] — el sistema tira error si intentás facturar sin stock
- ☐ Sí, permitir y mostrar warning
- ☐ Configurable por producto (más flexible, más complejo)

**¿Cuántos almacenes / depósitos manejan?**

- ☐ **Uno solo** [D]
- ☐ Varios — listar: **`[___]`** ⚠️ esto agrega ~16h al proyecto

**¿Reservar stock cuando una cotización se aprueba?**

- ☐ **NO, el stock se descuenta solo cuando se factura** [D]
- ☐ Sí, mostrar "stock disponible" descontando lo comprometido

### I.2 Crédito y cobranzas (módulo B.10)

**Plazo de crédito default para clientes nuevos:**

- ☐ 0 días (contado) [D]
- ☐ 15 días
- ☐ 30 días
- ☐ Otro: **`[___]`**

**Si la factura está en USD y el cliente paga en PEN, ¿qué tipo de cambio aplicar?**

- ☐ **Tipo de cambio del DÍA DEL PAGO (SUNAT TC)** [D]
- ☐ El de la fecha de emisión de la factura
- ☐ Manual (lo ingresa el operador)

**Si un cliente paga MÁS que el saldo de la factura:**

- ☐ **Rechazar el pago, error claro** [D] (recomendado para v1)
- ☐ Aceptar el excedente como "saldo a favor / a cuenta" (más complejo)

**Si el cliente excede su línea de crédito al intentar emitir factura:**

- ☐ **Bloquear emisión automáticamente** [D]
- ☐ Solo mostrar warning, permitir emisión
- ☐ Pedir aprobación del Superadmin (workflow extra)

### I.3 Cotizaciones (módulo B.5)

**Validez default de una cotización:**

- ☐ 7 días
- ☐ **15 días** [D]
- ☐ 30 días
- ☐ Otro: **`[___]`**

**¿Qué pueden hacer los Comerciales con descuentos en cotizaciones?**

- ☐ Sin descuentos (rígido)
- ☐ **Hasta 5% sin aprobación; mayor → permiso especial** [D]
- ☐ Cualquier descuento sin restricción

**Margen mínimo: si una línea de cotización deja margen menor al mínimo del producto:**

- ☐ **Bloquear emisión, error claro** [D]
- ☐ Permitir con warning
- ☐ Permitir solo si Superadmin aprueba

**¿La cotización se envía al cliente automáticamente por email al cambiar a "enviada"?**

- ☐ **NO en v1; se descarga PDF y se envía manual por WhatsApp/email del comercial** [D]
- ☐ Sí, con email automático desde el sistema

### I.4 Catálogo (módulo B.4)

**Productos descatalogados (que ya no se venden):**

- ☐ **Solo flag `descatalogado`, mantener histórico de kardex** [D]
- ☐ Borrar completamente

**¿Quién puede ver el precio de COMPRA de un producto?**

- ☐ Solo Superadmin
- ☐ **Superadmin + Facturación** [D]
- ☐ Cualquier rol que tenga el permiso `productos.ver_costo` (configurable)

**¿Quién puede modificar el margen mínimo de un producto?**

- ☐ **Solo Superadmin** [D]
- ☐ Cualquiera con permiso `productos.editar_margen`

### I.5 Facturación SUNAT (módulo B.9)

**¿Series adicionales además de F001 (factura) y B001 (boleta)?**

- ☐ Solo F001 y B001 [D]
- ☐ Sí, agregar: **`[___]`** (ej. F002 si facturan desde otra sucursal)

**¿Quién puede anular una factura emitida (genera Nota de Crédito)?**

- ☐ **Solo Superadmin** [D]
- ☐ Superadmin + Facturación
- ☐ Cualquiera con permiso `facturas.anular`

**¿Soportar Nota de Crédito parcial (devolución solo de algunos ítems) en v1?**

- ☐ **NO en v1, solo NC totales (anulación completa)** [D]
- ☐ Sí, permitir devolución por ítem ⚠️ +6h al proyecto

### I.6 Reportes (módulo B.11)

**¿El rol "Comercial" ve solo sus propias ventas o todas?**

- ☐ **Sus propias** [D] (filtra por `comercial_id = current_user`)
- ☐ Todas las del tenant

**¿Compartir reportes vía link público (sin login)?**

- ☐ **NO** [D] (todo requiere autenticación)
- ☐ Sí, links con token y expiración

---

## 📅 J. Cronograma y reuniones

- [ ] Día y horario para reuniones recurrentes (cada 5 días hábiles): **`[___]`**
- [ ] Modalidad: ☐ Presencial ☐ Google Meet ☐ Mix
- [ ] ¿Lucas estará viajando o fuera entre Día 1 y Día 33?:
  - Fechas no disponibles: **`[___]`**
  - Persona que aprueba en su ausencia: **`[___]`**

---

## ✍️ K. Asuntos contractuales pendientes

- [ ] Confirmar Anexo I (alcance funcional, 38 ítems) — leído y aceptado: ☐ Sí
- [ ] Anexo II (soporte continuado post-garantía): firmar después o ya:
  - ☐ Lo firmamos ahora (USD \_\_/mes a partir del Día 64)
  - ☐ Lo discutimos en Demo final (Día 33)
- [ ] Garantía 30 días post-Go-Live: incluida (cláusula 6 del contrato) ✅

---

## 💼 L. NUBEFACT (proveedor SUNAT)

- [ ] Cuenta NUBEFACT para Idex creada: ☐ Sí (RUTA: **`[___]`** TOKEN: **`[___]`**) ☐ Pendiente (deadline: Día 16)
- [ ] Cuenta NUBEFACT para Agroalves creada: ☐ Sí (RUTA: **`[___]`** TOKEN: **`[___]`**) ☐ Pendiente
- [ ] Plan contratado: ☐ Integración API (~S/ 70/mes) [recomendado] ☐ Otro
- [ ] Pago directo a NUBEFACT (no pasa por Dignita): ☐ entendido y aceptado

---

## ✅ Firma final

```
Acepto los términos y entrego los assets descritos arriba según los deadlines indicados.

Firma:    _________________________
Lucas Escrivá de Romaní
Grupo Idex SAC

Fecha:    ____ / ____ / 2026
```

---

## 📎 Archivos a subir al Drive compartido

Antes de la reunión Día 1, subir a la carpeta compartida `Orion-Kickoff/`:

- [ ] `1-logos/idex-logo.svg` (o .png ≥1024px)
- [ ] `1-logos/idex-favicon.png`
- [ ] `1-logos/agroalves-logo.svg`
- [ ] `1-logos/agroalves-favicon.png`
- [ ] `2-catalogos/idex-catalogo-segelectrica.xlsx` ✅ (ya subido)
- [ ] `2-catalogos/agroalves-catalogo.xlsx`
- [ ] `3-clientes/clientes-historicos.xlsx` (o CSV)
- [ ] `4-fiscal/idex-ficha-ruc-screenshot.png` (de SOL)
- [ ] `4-fiscal/agroalves-ficha-ruc-screenshot.png`
- [ ] `5-este-checklist-firmado.pdf` (este mismo doc, firmado)

---

_Última actualización: 2026-04-29. Si necesitás aclarar alguna pregunta, escribime por WhatsApp y la agregamos al doc antes de la reunión._
