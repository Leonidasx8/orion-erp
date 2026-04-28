# ADR 0006 — Generación de PDFs con @react-pdf/renderer

**Estado**: Aceptado
**Fecha**: 2026-04-28

## Decisión

**`@react-pdf/renderer`** para todos los PDFs (cotizaciones, OC, facturas, guías).

## Alternativas descartadas

### Puppeteer / Playwright (HTML→PDF)

- ✅ Alta fidelidad visual
- ❌ Requiere Chromium en el server (~120MB)
- ❌ NO funciona en Vercel serverless functions
- ❌ Cold start lento

### pdfkit / PDFKit

- ✅ Sin dependencia browser
- ❌ API imperativa, layouts complejos son dolor
- ❌ Sin React

### jsPDF

- ✅ Cliente
- ❌ Cliente = no controlamos rendering
- ❌ No sirve para enviar PDF por email automáticamente

## Consecuencias

- Layouts complejos requieren más código que con HTML/CSS
- Funciona perfecto en Vercel serverless
- Templates en `src/lib/pdf/`:
  - `cotizacion-template.tsx`
  - `factura-template.tsx`
  - `guia-template.tsx`
  - `orden-compra-template.tsx`
- Cada template recibe `tenant` + `documento` y devuelve un `<Document>`

## Referencias

- <https://react-pdf.org/>
- `iconikapp/invoice-template-react-pdf` (referencia visual)
