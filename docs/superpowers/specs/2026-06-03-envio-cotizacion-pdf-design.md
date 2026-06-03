# Envío de cotización — adjuntar PDF de verdad (WhatsApp + Gmail)

**Fecha:** 2026-06-03
**Archivo afectado:** `src/components/modules/cotizaciones/CotizacionActions.tsx`
**Alcance:** Frontend puro. Sin backend, sin migraciones, sin nuevas dependencias.

## Problema

El modal `EnviarModal` ofrece WhatsApp y Correo, pero ningún canal lleva el PDF
de verdad: solo incrusta un **link** a `/api/.../pdf` en el mensaje. El correo
usa `mailto:` (cliente del SO, impredecible). Se siente poco profesional.

## Decisiones

- **Correo:** abrir **Gmail web compose**
  (`https://mail.google.com/mail/?view=cm&fs=1&to=&su=&body=`) con todo
  pre-rellenado. No usar Resend ni backend.
- **WhatsApp:** mantener `wa.me`, pero descargar el PDF primero.
- **Mecánica común:** al elegir canal, **descargar el PDF** (`<a download>`,
  mismo endpoint, nombre `Cotizacion-{número}.pdf`), abrir el canal con mensaje
  pre-redactado y mostrar toast "PDF descargado — adjúntalo aquí".

## Cambios

1. **`descargarPdf()`** — helper en `EnviarModal`: crea un `<a href={pdfUrl}
download="Cotizacion-{num}.pdf">`, lo clickea y lo remueve. Mismo origen, así
   que `download` fuerza la descarga pese a `Content-Disposition: inline`.

2. **`handleWhatsApp`** — `descargarPdf()` → `wa.me/51{tel}?text=…` con mensaje
   limpio (sin el link a la API) → toast → `onEnviar()` (salvo modo compartir) →
   `onClose()`.

3. **`handleEmail`** — `descargarPdf()` → Gmail compose URL con `to/su/body` →
   toast → `onEnviar()` (salvo modo compartir) → `onClose()`.

4. **UX del modal:**
   - Deshabilitar WhatsApp si no hay `clienteTelefono`; Correo si no hay
     `clienteEmail`.
   - Quitar el link crudo de la API de los mensajes.
   - "Solo cambiar estado" se mantiene (oculto en modo compartir).

5. **Reenviar:** el botón "Reenviar" (cotización ya enviada) hoy solo muestra
   un toast "próximamente". Conectarlo al mismo modal en modo **solo compartir**
   (`soloCompartir`): descarga PDF + abre canal **sin** volver a cambiar estado.
   En este modo el título es "Reenviar cotización" y se oculta "Solo cambiar
   estado".

## Fuera de alcance

Resend / envío server-side, WhatsApp Business API, adjuntar el PDF de forma
automática (no es posible vía `wa.me`/Gmail compose URL).
