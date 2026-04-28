# ADR 0009 — Propiedad del repositorio en GitHub

**Estado**: Aceptado (con observación)
**Fecha**: 2026-04-28
**Decidido por**: Leonidas Yauri

## Decisión

Repositorio `orion-erp` en el user personal de GitHub `leonidasx8`.

## Observación / Riesgo registrado

Esta decisión tiene riesgos a futuro que registramos para no olvidar:

1. **Mezcla de responsabilidades**: el repo es propiedad de Leonidas como persona, no de Dignita SAC como empresa.
2. **Sucesión / colaboradores**: si Dignita contrata otros desarrolladores, deben recibir invitación al user personal de Leonidas (raro profesionalmente).
3. **Transferencia al cliente**: si en algún momento Lucas pide acceso al código (cláusula 6.4 del contrato si paga el saldo), transferir desde un user personal queda menos profesional que desde una org corporativa.
4. **Riesgo de cuenta**: si la cuenta personal se ve comprometida o suspendida, todo el código queda en riesgo.

## Mitigación

- **Migración trivial cuando se quiera**: GitHub permite transferir un repo entre user y org sin perder historial, issues, stars ni forks. La migración futura es 1 click.
- **Mientras tanto**: 2FA obligatorio en la cuenta de Leonidas, recovery codes guardados en password manager + lugar físico, backups del repo automáticos a Google Drive vía GitHub Actions.

## Cuándo migrar

Sugerido en cualquiera de estos hitos:

- Cuando Dignita tenga 2+ desarrolladores
- Cuando Orión se venda a un segundo cliente
- Antes del Go-Live (mes 2 desde la firma del contrato)

## Referencias

- Conversación de planificación 28/04/2026
- `setup-orion.sh` línea X (config del fork)
