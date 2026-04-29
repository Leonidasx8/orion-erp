# Claude Design — Bundle de contexto para Sistema Orión

Esta carpeta contiene **todo lo que Claude Design necesita** para producir mockups
de UI para Sistema Orión (ERP B2B multi-tenant de Grupo Idex SAC).

## Cómo usarlo

### Opción A — Subida múltiple (recomendada)

1. Abrir [claude.ai](https://claude.ai) con un proyecto nuevo
2. Pegar el contenido de `00-PROMPT.md` como mensaje principal
3. Adjuntar los archivos `01-implementation-plan.md` a `07-patterns-from-references.md`
4. Enviar

### Opción B — Subida de un solo archivo

Si la interfaz solo permite un archivo:

1. Subir `bundle-completo.md` (incluye prompt + los 7 docs concatenados)
2. Mensaje: "Procesá este bundle siguiendo las instrucciones del bloque `00-PROMPT.md` que contiene"

### Opción C — Copy/paste manual

```bash
# Concatenar todo en clipboard (macOS)
cat 00-PROMPT.md 01-*.md 02-*.md 03-*.md 04-*.md 05-*.md 06-*.md 07-*.md | pbcopy
```

Pegar en Claude Design.

## Contenido

| Archivo                          | Tamaño  | Propósito                                                                                        |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `00-PROMPT.md`                   | 9 KB    | Prompt principal con instrucciones, layout, paleta, lista de pantallas                           |
| `01-implementation-plan.md`      | 70 KB   | **CRÍTICO**. Apéndice A tiene las ~50 pantallas con propósito + datos + acciones + estados + rol |
| `02-project-overview.md`         | 3 KB    | Qué es Orión, audiencia, contexto de negocio                                                     |
| `03-stack-conventions.md`        | 8 KB    | Convenciones de naming, idioma (ES UI / EN code), estructura de archivos                         |
| `04-multi-tenant-pattern.md`     | 6 KB    | URLs path-based, JWT claims, branding por tenant                                                 |
| `05-rbac-casbin.md`              | 10 KB   | Permisos por rol — qué oculta o muestra cada rol                                                 |
| `06-modules-spec.md`             | 11 KB   | Detalle de cada módulo (campos, estados de cada entidad)                                         |
| `07-patterns-from-references.md` | 36 KB   | Patrones de UI extraídos de invoify, tremor, etc.                                                |
| `bundle-completo.md`             | ~150 KB | Todo lo anterior concatenado en un solo archivo                                                  |

## Output esperado de Claude Design

1. Sistema de diseño documentado (paleta, tipografía, spacing, 9 componentes compartidos)
2. **26 pantallas de prioridad alta** en mockups de alta fidelidad
3. Cada pantalla en 2 estados (default + uno destacado)
4. Tema light obligatorio, dark opcional
5. Spec mínima exportable (tokens de color, tipografía, spacing scale)

## Orden sugerido

Pedirle que empiece por el **sistema de diseño**, después las pantallas en este orden:

1. Pantalla 1 (`/admin` dashboard plataforma)
2. Pantalla 2-3 (gestión tenants)
3. Pantalla 4-6 (auth flow)
4. Pantalla 7 (dashboard tenant)
5. Pantallas 14-16 (flujo cotización completo — el más complejo)
6. Resto en orden del catálogo

## Feedback de Lucas

Después de la primera iteración, mostrar a Lucas y pedirle priorizar:

- ¿La densidad de información es la correcta o muy apretada/holgada?
- ¿Los colores transmiten la marca de cada empresa correctamente?
- ¿El flujo de cotización (la pantalla más usada) es claro?
- ¿Falta algún campo o acción crítica en alguna pantalla?

## Próximas iteraciones

Iteración 2: Pantallas de prioridad media (configuración tenant, auditoría, reportes)
Iteración 3: Refinamiento basado en feedback de uso real

---

**Última actualización**: 2026-04-29
**Branch**: `chore/research-and-plan`
**Repo fuente**: `Leonidasx8/orion-erp`
