# Manual de usuario — Orion ERP

### Grupo Idex SAC · Versión 1.0 · Junio 2026

**Sistema:** https://orion-rp.com/idex  
**Soporte:** leonidas.yauri@dignita.tech

---

## Índice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Dashboard](#2-dashboard)
3. [Clientes](#3-clientes)
4. [Productos](#4-productos)
5. [Cotizaciones](#5-cotizaciones)
6. [Órdenes de Compra](#6-órdenes-de-compra)
7. [Inventario](#7-inventario)
8. [Guías de Remisión](#8-guías-de-remisión)
9. [Facturas y Boletas](#9-facturas-y-boletas)
10. [Crédito y Cuentas por Cobrar](#10-crédito-y-cuentas-por-cobrar)
11. [Pipeline de ventas](#11-pipeline-de-ventas)
12. [Reportes](#12-reportes)
13. [Auditoría](#13-auditoría)
14. [Usuarios y Roles](#14-usuarios-y-roles)
15. [Configuración](#15-configuración)
16. [Flujo completo de una venta](#16-flujo-completo-de-una-venta)
17. [Preguntas frecuentes](#17-preguntas-frecuentes)

---

## 1. Acceso al sistema

### Ingresar

1. Abre el navegador y ve a **https://orion-rp.com/idex**
2. Ingresa tu correo y contraseña.
3. Haz clic en **Iniciar sesión**.

> El sistema funciona en cualquier navegador moderno (Chrome, Firefox, Edge, Safari). También es responsivo en móvil.

### Cerrar sesión

Haz clic en tu nombre (esquina superior derecha) y selecciona **Cerrar sesión**.

---

## 2. Dashboard

El Dashboard es la pantalla principal que ves al ingresar. Muestra un resumen del negocio en tiempo real.

### KPIs disponibles

| Indicador        | Qué muestra                                           |
| ---------------- | ----------------------------------------------------- |
| Ventas USD (mes) | Total facturado en dólares en el mes corriente        |
| Ventas PEN (mes) | Total facturado en soles en el mes corriente          |
| Clientes únicos  | Número de clientes con al menos una factura emitida   |
| Ticket promedio  | Valor promedio por factura del mes                    |
| CxC total        | Total de cuentas por cobrar pendientes                |
| Stock crítico    | Productos con stock por debajo del mínimo configurado |

> Cada KPI es un enlace — haz clic para ir directamente al reporte correspondiente.

### Gráficos

- **Ventas · 12 meses** — evolución mensual de ventas.
- **Pipeline cotizaciones** — distribución de cotizaciones por etapa (Borrador, Enviada, Aceptada, Convertida).
- **Top clientes** — los clientes con mayor facturación en el año.
- **Top productos** — los productos más vendidos en el año.

---

## 3. Clientes

### Ver la lista de clientes

Ve al menú lateral → **Clientes**.

La lista muestra todos los clientes con nombre, RUC/DNI, teléfono y estado.

### Crear un cliente nuevo

1. Haz clic en **Nuevo cliente**.
2. Completa los campos:
   - **Tipo de documento:** RUC (empresa) o DNI (persona natural)
   - **Número de documento:** RUC de 11 dígitos o DNI de 8
   - **Razón social / Nombre**
   - **Dirección fiscal**
   - **Teléfono** y **Email** (opcional pero recomendado para el envío de cotizaciones)
   - **Límite de crédito** (en USD) — deja en 0 si no aplica crédito
3. Haz clic en **Guardar**.

### Editar un cliente

1. Haz clic sobre el nombre del cliente en la lista.
2. En la vista de detalle, haz clic en **Editar**.
3. Modifica los campos y haz clic en **Guardar**.

### Buscar un cliente

Usa la barra de búsqueda en la parte superior de la lista. Puedes buscar por nombre, RUC o email.

---

## 4. Productos

### Ver el catálogo

Ve al menú lateral → **Productos**.

Muestra los 476 productos del catálogo (cables CELSA + productos propios). Puedes filtrar por familia/categoría, buscar por nombre o SKU, y ordenar por precio.

### Crear un producto nuevo

1. Haz clic en **Nuevo producto**.
2. Completa:
   - **SKU** — código único (ej. `NYY-2X4`)
   - **Nombre** — descripción completa
   - **Categoría** — familia de producto (ENERGÍA, CONSTRUCCIÓN, etc.)
   - **Unidad de medida** — MTR, UND, KG, etc.
   - **Costo unitario** — precio del proveedor (en la moneda indicada)
   - **Precio de venta** — precio al cliente (incluye tu margen)
   - **Controla stock** — activa si quieres llevar inventario de este producto
3. Haz clic en **Guardar**.

### Importar productos desde Excel (carga masiva)

Para cargar o actualizar muchos productos de una sola vez (por ejemplo, una lista de precios nueva de CELSA):

1. Ve a **Productos** → haz clic en **Importar**.
2. **Paso 1 — Subir archivo:** arrastra tu Excel (.xlsx) o CSV al recuadro. La primera hoja debe tener columnas **SKU** y **Costo** (o Precio); opcionalmente Nombre, Familia, Unidad de Medida y Precio de Venta. Puedes usar la plantilla oficial `plantilla-catalogo.xlsx` incluida en el paquete de entrega.
3. **Paso 2 — Vista previa:** el sistema valida cada fila (SKU vacío, duplicados, costo en 0, márgenes bajos) y te muestra los problemas. Puedes corregir cualquier fila con el lápiz de edición sin salir de la pantalla.
4. **Paso 3 — Confirmar:** haz clic en **Confirmar import**. Si un SKU ya existe, el producto se ACTUALIZA (nombre, costo, precio, familia); si no existe, se CREA. Las familias nuevas se crean automáticamente.

> Si dejas la columna Precio de Venta vacía, el sistema lo calcula con el margen global vigente (Configuración → Comercial).

### Editar precio de un producto

1. Haz clic sobre el producto.
2. En el detalle, haz clic en **Editar**.
3. Actualiza el **Precio de venta** o **Costo unitario**.
4. Haz clic en **Guardar**.

> Los precios CELSA de tu catálogo están basados en la lista de Abril 2026 con tipo de cambio S/ 3.75. Cuando CELSA actualice su lista, actualiza los costos aquí.

---

## 5. Cotizaciones

Las cotizaciones son el corazón del flujo de ventas. Sigue este ciclo:

```
Borrador → Enviada → Aceptada → Convertida (factura o compra)
```

### Crear una cotización

1. Ve a **Cotizaciones** → haz clic en **Nueva cotización**.
2. Selecciona el **cliente** (búsqueda por nombre o RUC).
3. Selecciona la **moneda** (PEN o USD).
4. En la sección **Líneas**, haz clic en **Agregar producto**:
   - Busca el producto por nombre o SKU.
   - Ingresa la **cantidad**.
   - El precio se pre-llena desde el catálogo; puedes ajustarlo si tienes permiso.
5. Verifica los **Términos** (pago, días de entrega, validez).
6. Haz clic en **Guardar borrador** para guardarlo sin enviarlo, o **Guardar y enviar** para pasarla a estado Enviada.

### Cambiar estado de una cotización

Desde el detalle de la cotización:

| Botón                          | Qué hace                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| **Enviar al cliente**          | Cambia de Borrador → Enviada                                 |
| **Marcar como aceptada**       | Cambia de Enviada → Aceptada                                 |
| **Rechazar**                   | Cierra la cotización como perdida                            |
| **Convertir a factura**        | Crea automáticamente una factura (disponible desde Aceptada) |
| **Generar compra a proveedor** | Crea una Orden de Compra a CELSA (disponible desde Aceptada) |
| **PDF**                        | Descarga el PDF de la cotización para enviar al cliente      |
| **Duplicar**                   | Crea una copia de la cotización (útil para recotizar)        |

### Filtros y vistas

En la lista de cotizaciones puedes filtrar por:

- **Estado:** Todas / Borrador / Enviadas / Aceptadas / Rechazadas / Vencidas / Convertidas
- **Fecha de emisión, Comercial, Cliente**
- **Vista:** Lista o Kanban (arrastra cotizaciones entre columnas)

---

## 6. Órdenes de Compra

Las Órdenes de Compra (OC) se generan desde una cotización aceptada para solicitar los productos a CELSA u otros proveedores.

### Ciclo de una OC

```
Borrador → Enviada → Aprobada → Recibida
```

### Crear una OC desde cotización

1. Abre la cotización en estado **Aceptada**.
2. Haz clic en **Generar compra a proveedor**.
3. El sistema pre-llena los productos y cantidades.
4. Revisa y haz clic en **Guardar**.

### Aprobar y recibir una OC

1. Ve a **Órdenes de Compra** → abre la OC.
2. **Enviar:** haz clic en **Enviar a proveedor** (cambia a estado Enviada).
3. **Aprobar:** haz clic en **Aprobar** (indica que CELSA confirmó el pedido).
4. **Recibir:** cuando llegue la mercadería, haz clic en **Registrar recepción**, confirma las cantidades recibidas y haz clic en **Confirmar recepción**. Esto actualiza el inventario automáticamente.

---

## 7. Inventario

### Ver el inventario actual

Ve a **Inventario**. Muestra todos los productos con sus niveles de stock actuales.

### Ajuste manual de stock

Usa ajustes manuales cuando necesites corregir diferencias de inventario (merma, conteo físico, etc.):

1. Haz clic en **Ajuste manual**.
2. Selecciona el producto.
3. Ingresa la cantidad de ajuste (positiva para entrada, negativa para salida).
4. Selecciona el motivo (Conteo físico, Merma, Devolución, Otro).
5. Haz clic en **Confirmar ajuste**.

### Kardex

El Kardex muestra el historial completo de movimientos de un producto:

1. Haz clic sobre un producto en la lista.
2. Selecciona la pestaña **Kardex**.
3. Verás entradas, salidas, ajustes y el saldo acumulado.

> **Nota:** El inventario de Grupo Idex no controla stock físico en este primer ciclo. Los productos CELSA tienen `controla_stock = false`. Activa el control de stock por producto cuando empiecen a manejar almacén propio.

---

## 8. Guías de Remisión

Las guías de remisión son documentos electrónicos (GRE) que autoriza SUNAT para el traslado de mercadería.

### Crear una guía

1. Ve a **Guías remisión** → haz clic en **Nueva guía**.
2. Completa:
   - **Remitente** (Grupo Idex SAC — se pre-llena)
   - **Destinatario** (cliente o almacén destino)
   - **Dirección de partida** y **Dirección de llegada**
   - **Transportista** (datos del conductor o empresa de transporte): RUC, nombre, placa, peso
   - **Productos a trasladar:** agrega las líneas con producto, cantidad y unidad de medida
3. Haz clic en **Guardar**.

### Enviar a SUNAT

Desde el detalle de la guía, haz clic en **Enviar a SUNAT**. El sistema la procesa automáticamente vía Nubefact. En segundos verás el estado:

- **Aceptada** ✅ — guía válida, puedes imprimirla
- **Error** ❌ — revisa los datos (peso, código de producto, dirección)

### Imprimir / descargar PDF

Abre el detalle de la guía y baja hasta la sección **"Documentos SUNAT"** (al final de la página): ahí están los botones **PDF** (versión imprimible con código QR), **XML** y **CDR**. Estos botones aparecen una vez que SUNAT acepta la guía.

> La serie activa es **T001**. La guía T001-00000008 fue aceptada por SUNAT en las pruebas de entrega.

---

## 9. Facturas y Boletas

### Crear una factura desde cotización (recomendado)

1. Abre la cotización en estado **Aceptada**.
2. Haz clic en **Convertir a factura**.
3. El sistema pre-llena todos los datos. Revisa y haz clic en **Emitir factura**.
4. La factura se envía automáticamente a SUNAT vía Nubefact. En segundos verás el resultado.

### Crear una factura manual

1. Ve a **Facturas** → haz clic en **Nueva factura**.
2. Selecciona el **cliente** (debe tener RUC).
3. Agrega las líneas de productos.
4. Verifica IGV y total.
5. Haz clic en **Emitir**.

### Crear una boleta

Igual que la factura, pero con cliente de DNI. Ve a **Nueva boleta**.

### Estados de una factura

| Estado            | Descripción                                   |
| ----------------- | --------------------------------------------- |
| Lista para emitir | Guardada pero no enviada a SUNAT              |
| Pendiente SUNAT   | Enviada, esperando respuesta del OSE          |
| Aceptada SUNAT    | ✅ Comprobante válido                         |
| Rechazada SUNAT   | ❌ Error de validación — ver mensaje de SUNAT |
| Anulada           | Baja o anulación aceptada por SUNAT           |

### Nota de Crédito (anulación parcial o total)

Cuando necesites corregir o anular una factura emitida:

1. Abre la factura en estado **Aceptada SUNAT**.
2. Haz clic en **Nota de crédito**.
3. Selecciona el motivo y el tipo (anulación o corrección de precio).
4. Haz clic en **Emitir nota de crédito**.

> Serie activa: **F001** para facturas. La primera factura real desde Orion será la **F001-00000015**.  
> Importante: coordinar con Nubefact el correlativo antes de emitir comprobantes reales.

---

## 10. Crédito y Cuentas por Cobrar

Ve a **Crédito y CxC** para ver el estado de cobros pendientes.

### Aging report

Muestra los saldos por cobrar agrupados por antigüedad:

- Al día
- 1–30 días
- 31–60 días
- 61–90 días
- Más de 90 días

### Gestionar un cliente con crédito

1. En el detalle del cliente, configura el **Límite de crédito** (en USD).
2. Cuando un cliente supera su límite, el sistema emite una **alerta** al intentar crear una nueva cotización.

---

## 11. Pipeline de ventas

Ve a **Pipeline** para ver todas las oportunidades activas en formato Kanban.

### Columnas del pipeline

1. **Prospecto** — contacto inicial identificado
2. **Calificado** — oportunidad validada
3. **Propuesta** — cotización enviada
4. **Negociación** — en conversación de términos
5. **Ganado** — cotización aceptada / convertida
6. **Perdido** — cotización rechazada

### Usar el pipeline

- **Arrastrar** una tarjeta entre columnas para cambiar su estado.
- **Hacer clic** en una tarjeta para ver el detalle y acceder a la cotización.
- Haz clic en **+ Nuevo** en cualquier columna para crear una oportunidad directamente.

---

## 12. Reportes

Ve a **Reportes** para acceder a 4 tipos de análisis:

| Reporte          | Descripción                                            |
| ---------------- | ------------------------------------------------------ |
| **Ventas**       | Resumen de facturación por período, cliente y producto |
| **Cotizaciones** | Tasa de conversión, tiempo promedio de cierre          |
| **Precios**      | Análisis de márgenes por producto y cliente            |
| **Inventario**   | Valorización del inventario actual                     |

### Filtrar un reporte

Cada reporte tiene filtros por **período**, **cliente**, **producto** y **moneda**. Haz clic en el filtro correspondiente y selecciona el rango.

### Exportar

Haz clic en **Exportar** (disponible en la mayoría de reportes) para descargar en Excel.

---

## 13. Auditoría

Ve a **Auditoría** para ver el registro completo de todas las acciones realizadas en el sistema.

Cada entrada muestra:

- **Fecha y hora**
- **Usuario** que realizó la acción
- **Módulo** afectado
- **Descripción** de la acción

Este módulo es útil para rastrear quién hizo qué y cuándo. Solo los administradores tienen acceso.

---

## 14. Usuarios y Roles

### Usuarios

Ve a **Administración → Usuarios** para ver todos los usuarios del sistema.

#### Crear un usuario nuevo

1. Haz clic en **Nuevo usuario**.
2. Ingresa nombre, correo y rol asignado.
3. El usuario recibirá un correo para establecer su contraseña.

#### Roles disponibles

| Rol            | Acceso                                           |
| -------------- | ------------------------------------------------ |
| **Admin**      | Acceso total a todos los módulos y configuración |
| **Comercial**  | Cotizaciones, Clientes, Productos, Pipeline      |
| **Almacenero** | Inventario, Órdenes de Compra, Guías             |

### Roles y permisos

Ve a **Administración → Roles** para ver la matriz de permisos por módulo.

Para modificar los permisos de un rol:

1. Haz clic en el nombre del rol.
2. Activa o desactiva el acceso a cada módulo (Ver / Crear / Editar / Eliminar).
3. Haz clic en **Guardar**.

---

## 15. Configuración

Ve a **Configuración** para ajustar los datos globales del sistema.

### Pestaña: Empresa

| Campo                      | Descripción                                           |
| -------------------------- | ----------------------------------------------------- |
| URL del logo               | Link a la imagen del logo (aparece en PDFs y sidebar) |
| Razón social               | Nombre legal de la empresa                            |
| RUC                        | Número de RUC (11 dígitos)                            |
| Dirección fiscal           | Dirección que aparece en los comprobantes             |
| Teléfono, Email, Sitio web | Datos de contacto                                     |

Haz clic en **Guardar cambios** al terminar.

### Pestaña: Comercial

| Campo                         | Descripción                                                                 |
| ----------------------------- | --------------------------------------------------------------------------- |
| Margen mínimo global          | % mínimo de margen — cotizaciones por debajo requieren aprobación del Admin |
| Aprobación obligatoria sobre  | Monto en USD a partir del cual se requiere aprobación antes de enviar       |
| Aplicar IGV automático        | 18% IGV en todas las líneas gravadas                                        |
| Permitir descuentos por línea | Los comerciales pueden ajustar precios por línea                            |

### Pestaña: Facturación SUNAT

Credenciales de la integración con Nubefact OSE:

- **Usuario Nubefact**, **Contraseña**, **RUC emisor**
- **Series activas:** F001 (facturas), F002 (notas de crédito), T001 (guías)

> No cambies estas credenciales sin coordinar con el equipo de Orion.

### Pestaña: Usuarios y permisos

Acceso directo a la gestión de usuarios (equivalente al módulo Usuarios en el menú).

---

## 16. Flujo completo de una venta

Este es el flujo típico de principio a fin:

```
1. CLIENTE    → Crea o busca el cliente en Clientes
2. COTIZACIÓN → Nueva cotización con productos del catálogo
              → Guarda como Borrador
              → Envía al cliente (Borrador → Enviada)
              → Cliente acepta (Enviada → Aceptada)
3. COMPRA     → Genera OC a CELSA (Aceptada → OC Borrador → Aprobar)
4. FACTURA    → Convierte cotización a factura electrónica
              → SUNAT acepta (F001-XXXXX Aceptada)
5. GUÍA       → Crea guía de remisión para el traslado
              → Envía a SUNAT (T001-XXXXX Aceptada)
6. COBRO      → Verifica en Crédito y CxC que el pago llegó
```

---

## 17. Preguntas frecuentes

**¿Puedo cambiar el precio de un producto en la cotización?**  
Sí, si tienes el permiso de "Permitir descuentos por línea" activado en Configuración. De lo contrario, el precio se toma del catálogo.

**¿Qué pasa si SUNAT rechaza una factura?**  
El sistema muestra el mensaje de error de SUNAT. Corriges los datos (RUC del cliente, descripción del producto, etc.) y vuelves a emitir. No se genera un nuevo número — se reintenta con el mismo.

**¿Puedo emitir en dólares?**  
Sí. Al crear la cotización o factura, selecciona **USD** como moneda. SUNAT acepta facturas en USD (incluye el tipo de cambio automáticamente).

**¿Cómo agrego más productos al catálogo?**  
Uno por uno: Productos → Nuevo producto. Para listas grandes usa **Productos → Importar** (Excel/CSV): valida, previsualiza y crea o actualiza cientos de productos en un clic (ver sección 4).

**¿El sistema funciona en el celular?**  
Sí, el diseño es responsivo. Funciona en Chrome o Safari móvil. La barra lateral se convierte en menú hamburguesa.

**¿Dónde veo el PDF de una factura?**  
En el detalle de la factura, haz clic en **PDF**. También puedes ver el XML y el CDR (respuesta de SUNAT) desde el mismo detalle.

**¿Cómo cambio mi contraseña?**  
Haz clic en tu nombre (esquina superior derecha) → **Mi cuenta** → **Cambiar contraseña**.

---

_Manual preparado por el equipo Orion ERP · junio 2026_  
_Soporte: leonidas.yauri@dignita.tech_
