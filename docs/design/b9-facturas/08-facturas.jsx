/* Screens 20-22: Facturas */

const FacturasList = () => (
  <Screen tenant="idex" active="facturas" crumbs={['Idex', 'Facturas']}>
    <PageHead
      title="Facturas electrónicas"
      subtitle="Abril 2026 · 87 emitidas · USD 142.318,40"
      actions={
        <>
          <button className="btn">
            <I.download size={13} />
            Exportar XML masivo
          </button>
          <button className="btn btn-primary">
            <I.plus size={13} />
            Nueva factura
          </button>
        </>
      }
    />

    {/* SUNAT health strip */}
    <div
      className="card"
      style={{
        marginBottom: 16,
        padding: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 12,
      }}
    >
      {[
        { l: 'Aceptadas', v: '81', tone: 'good', icon: <I.check size={13} /> },
        { l: 'Pendientes', v: '3', tone: 'warn', icon: <I.clock size={13} /> },
        { l: 'Rechazadas', v: '2', tone: 'danger', icon: <I.x size={13} /> },
        { l: 'Anuladas', v: '1', tone: 'muted', icon: <I.x size={13} /> },
        {
          l: 'Estado SUNAT',
          v: 'OK',
          tone: 'good',
          sub: 'última conexión 14:23',
          icon: <I.cloud size={13} />,
        },
      ].map((k, i) => (
        <div key={i}>
          <div className="row" style={{ gap: 6 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                display: 'grid',
                placeItems: 'center',
                background:
                  k.tone === 'good'
                    ? 'var(--success-soft)'
                    : k.tone === 'warn'
                      ? 'var(--warn-soft)'
                      : k.tone === 'danger'
                        ? 'var(--danger-soft)'
                        : 'var(--bg-muted)',
                color:
                  k.tone === 'good'
                    ? 'var(--success-fg)'
                    : k.tone === 'warn'
                      ? 'var(--warn-fg)'
                      : k.tone === 'danger'
                        ? 'var(--danger-fg)'
                        : 'var(--fg-muted)',
              }}
            >
              {k.icon}
            </span>
            <span className="muted" style={{ fontSize: 11.5 }}>
              {k.l}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{k.v}</div>
          {k.sub && (
            <div className="muted" style={{ fontSize: 10.5 }}>
              {k.sub}
            </div>
          )}
        </div>
      ))}
    </div>

    <div className="toolbar">
      <div className="row" style={{ flex: 1, gap: 8 }}>
        <div
          className="row"
          style={{
            height: 32,
            padding: '0 10px',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--bg)',
            minWidth: 280,
          }}
        >
          <I.search size={13} className="muted" />
          <input
            className="input"
            style={{
              border: 0,
              padding: 0,
              height: 30,
              background: 'transparent',
              flex: 1,
              minWidth: 0,
            }}
            placeholder="F001-… · cliente · RUC"
          />
        </div>
        <button className="btn btn-sm">
          <I.calendar size={12} />
          Abril 2026
          <I.chev_d size={11} />
        </button>
        <button
          className="btn btn-sm"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-fg)',
            borderColor: 'transparent',
          }}
        >
          Estado SUNAT: todas
          <I.x size={11} />
        </button>
        <button className="btn btn-sm">
          <I.filter size={12} />
          Tipo doc
          <I.chev_d size={11} />
        </button>
      </div>
    </div>

    <div className="card-table card" style={{ borderRadius: '0 0 8px 8px', borderTop: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Documento</th>
            <th>Cliente</th>
            <th>Emisión</th>
            <th>SUNAT</th>
            <th>Pago</th>
            <th className="num">Subtotal</th>
            <th className="num">IGV</th>
            <th className="num">Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[
            {
              n: 'F001-04812',
              t: 'Factura',
              cli: 'CONSTRUCTORA SUR EIRL',
              ruc: '20512345678',
              f: '28 abr',
              sun: 'aceptada',
              pag: 'pendiente',
              sub: 1936.4,
              igv: 348.55,
              tot: 2284.95,
            },
            {
              n: 'F001-04811',
              t: 'Factura',
              cli: 'TECNOLOGÍA INDUSTRIAL SAC',
              ruc: '20498765432',
              f: '27 abr',
              sun: 'aceptada',
              pag: 'pagada',
              sub: 3574.91,
              igv: 643.49,
              tot: 4218.4,
            },
            {
              n: 'F001-04810',
              t: 'Factura',
              cli: 'GRUPO MINERA CERRO VERDE',
              ruc: '20102341234',
              f: '26 abr',
              sun: 'aceptada',
              pag: 'parcial',
              sub: 18772.46,
              igv: 3378.04,
              tot: 22150.5,
            },
            {
              n: 'B001-00342',
              t: 'Boleta',
              cli: 'Carlos Mendoza Pérez',
              ruc: '10412938472',
              f: '26 abr',
              sun: 'aceptada',
              pag: 'pagada',
              sub: 152.54,
              igv: 27.46,
              tot: 180.0,
            },
            {
              n: 'F001-04809',
              t: 'Factura',
              cli: 'ELECTROANDES SA',
              ruc: '20100123456',
              f: '25 abr',
              sun: 'pendiente',
              pag: '—',
              sub: 1559.49,
              igv: 280.71,
              tot: 1840.2,
            },
            {
              n: 'F001-04808',
              t: 'Factura',
              cli: 'ELECTROMECÁNICA INDUSTRIAL SAC',
              ruc: '20458765432',
              f: '24 abr',
              sun: 'rechazada',
              pag: '—',
              sub: 10576.27,
              igv: 1903.73,
              tot: 12480.0,
              sunErr: '2335: número de serie no autorizado',
            },
            {
              n: 'F001-04807',
              t: 'Factura',
              cli: 'TÉCNICA Y SERVICIOS SUR EIRL',
              ruc: '20587412365',
              f: '24 abr',
              sun: 'anulada',
              pag: '—',
              sub: 2720.34,
              igv: 489.66,
              tot: 3210.0,
            },
            {
              n: 'F001-04806',
              t: 'Factura',
              cli: 'INVERSIONES MARTÍNEZ',
              ruc: '20654321987',
              f: '22 abr',
              sun: 'aceptada',
              pag: 'vencida',
              sub: 754.24,
              igv: 135.76,
              tot: 890.0,
              vencHace: 6,
            },
          ].map((r, i) => (
            <tr key={i}>
              <td>
                <div className="mono-text" style={{ fontSize: 11.5, color: 'var(--accent-fg)' }}>
                  {r.n}
                </div>
                <div className="muted" style={{ fontSize: 10.5 }}>
                  {r.t}
                </div>
              </td>
              <td style={{ maxWidth: 220 }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.cli}
                </div>
                <div className="muted mono-text" style={{ fontSize: 10.5 }}>
                  {r.ruc}
                </div>
              </td>
              <td className="muted">{r.f}</td>
              <td>
                <Badge estado={r.sun} />
                {r.sunErr && (
                  <div
                    className="muted"
                    style={{
                      fontSize: 10,
                      marginTop: 2,
                      color: 'var(--danger-fg)',
                      maxWidth: 200,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.sunErr}
                  </div>
                )}
              </td>
              <td>
                {r.pag === 'pagada' && (
                  <span style={{ color: 'var(--success-fg)', fontSize: 11.5 }}>Pagada</span>
                )}
                {r.pag === 'pendiente' && (
                  <span style={{ color: 'var(--fg-muted)', fontSize: 11.5 }}>Pendiente</span>
                )}
                {r.pag === 'parcial' && (
                  <span style={{ color: 'var(--warn-fg)', fontSize: 11.5 }}>Parcial 60%</span>
                )}
                {r.pag === 'vencida' && (
                  <span style={{ color: 'var(--danger-fg)', fontSize: 11.5 }}>
                    Vencida {r.vencHace}d
                  </span>
                )}
                {r.pag === '—' && <span className="muted">—</span>}
              </td>
              <td className="num">
                <Money value={r.sub} dp={2} />
              </td>
              <td className="num">
                <Money value={r.igv} dp={2} />
              </td>
              <td className="num">
                <strong>
                  <Money value={r.tot} dp={2} />
                </strong>
              </td>
              <td>
                <I.more size={14} className="muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card-foot">
        <span className="muted" style={{ fontSize: 12 }}>
          1–8 de 87 · totales mes <strong>USD 142.318,40</strong>
        </span>
      </div>
    </div>
  </Screen>
);

const FacturaNueva = () => (
  <Screen tenant="idex" active="facturas" crumbs={['Idex', 'Facturas', 'Nueva']}>
    <div className="row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
      <div>
        <div className="row" style={{ gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            Nueva factura electrónica
          </h1>
          <Badge estado="borrador" />
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          F001-04813 · pre-asignado · convertida desde COT-2026-00130
        </div>
      </div>
      <div style={{ marginLeft: 'auto' }} className="row">
        <button className="btn">Cancelar</button>
        <button className="btn">Guardar borrador</button>
        <button className="btn btn-primary">
          <I.cloud size={13} />
          Emitir y enviar a SUNAT
        </button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Datos del comprobante</div>
          </div>
          <div
            className="card-body"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}
          >
            <div className="field">
              <label className="label">
                Tipo documento <span className="req">*</span>
              </label>
              <select className="select">
                <option>Factura (01)</option>
                <option>Boleta (03)</option>
                <option>Nota de crédito (07)</option>
                <option>Nota de débito (08)</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Serie</label>
              <select className="select">
                <option>F001</option>
                <option>F002</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Número</label>
              <input className="input mono-text" defaultValue="04813" disabled />
              <div className="help">Asignado al emitir</div>
            </div>
            <div className="field">
              <label className="label">Fecha emisión</label>
              <input className="input" defaultValue="29 abr 2026" />
            </div>
            <div className="field">
              <label className="label">Fecha vencimiento</label>
              <input className="input" defaultValue="29 may 2026" />
            </div>
            <div className="field">
              <label className="label">Moneda</label>
              <select className="select">
                <option>USD</option>
                <option>PEN</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Cliente · GRUPO MINERA CERRO VERDE</div>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
              Cambiar
            </button>
          </div>
          <div
            className="card-body"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}
          >
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                RUC
              </div>
              <div className="mono-text">20102341234</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Razón social
              </div>
              <div>GRUPO MINERA CERRO VERDE SAA</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Dirección fiscal
              </div>
              <div>Av. Ricardo Palma 738, Yanahuara, Arequipa</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Email facturación
              </div>
              <div>facturacion@cerroverde.pe</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Crédito disponible
              </div>
              <div style={{ color: 'var(--success-fg)' }}>USD 27.850 de USD 50.000</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Términos
              </div>
              <div>Net 30 · sin descuento</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Líneas · 24 items</div>
            <span className="muted" style={{ marginLeft: 'auto', fontSize: 11.5 }}>
              copiados desde COT-2026-00130
            </span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descripción</th>
                <th className="num">Cant.</th>
                <th className="num">Precio</th>
                <th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['TER-50AWG-1/4', 'Terminal compresión 1 hueco 50 AWG ¼"', 5000, 0.1536, 768.0],
                ['TER-70AWG-1/2', 'Terminal compresión 1 hueco 70 AWG ½"', 8000, 0.2148, 1718.4],
                ['TER-95AWG-1/2', 'Terminal compresión 1 hueco 95 AWG ½"', 4000, 0.289, 1156.0],
                ['CAB-10AWG-NEG', 'Cable cobre 10 AWG color negro 600V', 2500, 1.42, 3550.0],
                ['CAB-14AWG-AZU', 'Cable cobre 14 AWG color azul 600V', 1500, 0.79, 1185.0],
                ['…', '+ 19 items adicionales', '', '', 10395.05],
              ].map((r, i) => (
                <tr key={i} className="tight-row">
                  <td
                    className="mono-text"
                    style={{
                      fontSize: 11.5,
                      color: r[0] === '…' ? 'var(--fg-muted)' : 'var(--fg)',
                    }}
                  >
                    {r[0]}
                  </td>
                  <td
                    style={{
                      maxWidth: 280,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: r[0] === '…' ? 'var(--fg-muted)' : undefined,
                      fontStyle: r[0] === '…' ? 'italic' : 'normal',
                    }}
                  >
                    {r[1]}
                  </td>
                  <td className="num">{r[2] ? r[2].toLocaleString('en-US') : '—'}</td>
                  <td className="num">{r[3] ? <Money value={r[3]} dp={4} /> : '—'}</td>
                  <td className="num">
                    <Money value={r[4]} dp={2} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="col" style={{ gap: 16 }}>
        <div className="card" style={{ borderColor: 'var(--accent-fg)' }}>
          <div className="card-head" style={{ background: 'var(--accent-soft)' }}>
            <I.cloud size={14} style={{ color: 'var(--accent-fg)' }} />
            <div className="card-title" style={{ marginLeft: 6, color: 'var(--accent-fg)' }}>
              Validación previa SUNAT
            </div>
          </div>
          <div className="card-body col" style={{ gap: 8, fontSize: 12 }}>
            {[
              ['RUC del cliente válido y activo', 'good'],
              ['Serie F001 autorizada al emisor', 'good'],
              ['Numeración correlativa (04812 → 04813)', 'good'],
              ['Cliente con crédito disponible', 'good'],
              ['Stock suficiente para todos los SKU', 'good'],
              ['Tipo de cambio SBS publicado del día', 'good'],
            ].map(([t, s], i) => (
              <div key={i} className="row">
                <I.check size={13} style={{ color: 'var(--success-fg)' }} />
                <span style={{ marginLeft: 8 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Totales</div>
          </div>
          <div className="card-body col" style={{ gap: 8, fontSize: 12.5 }}>
            <div className="row">
              <span className="muted">Op. gravada</span>
              <span className="num" style={{ marginLeft: 'auto' }}>
                <Money value={18772.46} dp={2} />
              </span>
            </div>
            <div className="row">
              <span className="muted">IGV 18%</span>
              <span className="num" style={{ marginLeft: 'auto' }}>
                <Money value={3378.04} dp={2} />
              </span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="row">
              <span style={{ fontSize: 13, fontWeight: 600 }}>Total a pagar</span>
              <span className="num" style={{ marginLeft: 'auto', fontSize: 22, fontWeight: 600 }}>
                <Money value={22150.5} dp={2} />
              </span>
            </div>
            <div className="muted" style={{ fontSize: 11.5, textAlign: 'right' }}>
              ≈ S/ 82.890,57 al TC SBS 3,7420
            </div>
          </div>
          <div className="divider" />
          <div className="card-body" style={{ paddingTop: 12, fontSize: 11.5 }}>
            <div className="row">
              <span className="muted">En letras</span>
            </div>
            <div style={{ marginTop: 4 }}>
              VEINTIDÓS MIL CIENTO CINCUENTA Y 50/100 DÓLARES AMERICANOS
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Al emitir, ocurrirá esto</div>
          </div>
          <div className="card-body col" style={{ gap: 8, fontSize: 11.5 }}>
            <div className="row">
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: 'var(--bg-muted)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                1
              </span>
              <span style={{ marginLeft: 8 }}>Se asigna correlativo definitivo F001-04813</span>
            </div>
            <div className="row">
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: 'var(--bg-muted)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                2
              </span>
              <span style={{ marginLeft: 8 }}>Se firma el XML con certificado digital</span>
            </div>
            <div className="row">
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: 'var(--bg-muted)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                3
              </span>
              <span style={{ marginLeft: 8 }}>Se envía a SUNAT y se espera CDR</span>
            </div>
            <div className="row">
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: 'var(--bg-muted)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                4
              </span>
              <span style={{ marginLeft: 8 }}>Se descuenta stock y se actualiza CxC</span>
            </div>
            <div className="row">
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: 'var(--bg-muted)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                5
              </span>
              <span style={{ marginLeft: 8 }}>Se envía PDF + XML al cliente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Screen>
);

const FacturaDetalle = () => (
  <Screen tenant="idex" active="facturas" crumbs={['Idex', 'Facturas', 'F001-04808']}>
    <div className="row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
      <div>
        <div className="row" style={{ gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            F001-04808
          </h1>
          <Badge estado="rechazada" />
          <span
            className="tag"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger-fg)' }}
          >
            <I.warn size={11} />
            Reintento disponible
          </span>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          ELECTROMECÁNICA INDUSTRIAL SAC · USD 12.480,00 · emitida 24 abr 2026 · M. Quispe
        </div>
      </div>
      <div style={{ marginLeft: 'auto' }} className="row">
        <button className="btn">
          <I.pdf size={13} />
          PDF
        </button>
        <button className="btn">
          <I.code size={13} />
          XML
        </button>
        <button className="btn">
          <I.copy size={13} />
          Copiar a nueva
        </button>
        <button className="btn btn-primary">
          <I.refresh size={13} />
          Reintentar envío
        </button>
      </div>
    </div>

    <div className="alert alert-danger" style={{ marginBottom: 16 }}>
      <I.x size={14} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500 }}>SUNAT rechazó el documento · código 2335</div>
        <div style={{ fontSize: 11.5, marginTop: 2 }}>
          "El número de serie F001 no se encuentra autorizado para el contribuyente emisor
          20100123456."
        </div>
        <div style={{ fontSize: 11.5, marginTop: 6, color: 'var(--fg-muted)' }}>
          <strong>Solución sugerida:</strong> verificar que la serie F001 esté dada de alta en el
          Portal SUNAT &gt; Comprobantes electrónicos. Una vez autorizada, reintentar el envío sin
          necesidad de regenerar el XML.
        </div>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Líneas · 18 items</div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descripción</th>
                <th className="num">Cant.</th>
                <th className="num">P. unit.</th>
                <th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['TER-150AWG-5/8', 'Terminal compresión 1 hueco 150 AWG ⅝"', 2500, 0.4528, 1132.0],
                ['TER-185AWG-3/4', 'Terminal compresión 1 hueco 185 AWG ¾"', 1800, 0.586, 1054.8],
                ['TER-240AWG-3/4', 'Terminal compresión 1 hueco 240 AWG ¾"', 1200, 0.7245, 869.4],
                ['CAB-10AWG-NEG', 'Cable cobre 10 AWG color negro 600V', 2500, 1.42, 3550.0],
                ['CAB-14AWG-AZU', 'Cable cobre 14 AWG color azul 600V', 2000, 0.79, 1580.0],
                ['…', '+ 13 items adicionales', '', '', 2390.07],
              ].map((r, i) => (
                <tr key={i} className="tight-row">
                  <td
                    className="mono-text"
                    style={{
                      fontSize: 11.5,
                      color: r[0] === '…' ? 'var(--fg-muted)' : 'var(--fg)',
                    }}
                  >
                    {r[0]}
                  </td>
                  <td
                    style={{
                      maxWidth: 280,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontStyle: r[0] === '…' ? 'italic' : 'normal',
                      color: r[0] === '…' ? 'var(--fg-muted)' : undefined,
                    }}
                  >
                    {r[1]}
                  </td>
                  <td className="num">{r[2] ? r[2].toLocaleString('en-US') : '—'}</td>
                  <td className="num">{r[3] ? <Money value={r[3]} dp={4} /> : '—'}</td>
                  <td className="num">
                    <Money value={r[4]} dp={2} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <td colSpan={2}>Subtotal</td>
                <td colSpan={2}></td>
                <td className="num">
                  <Money value={10576.27} dp={2} />
                </td>
              </tr>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <td colSpan={2}>IGV 18%</td>
                <td colSpan={2}></td>
                <td className="num">
                  <Money value={1903.73} dp={2} />
                </td>
              </tr>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <td colSpan={2}>
                  <strong>Total</strong>
                </td>
                <td colSpan={2}></td>
                <td className="num" style={{ fontWeight: 600, fontSize: 14 }}>
                  <Money value={12480.0} dp={2} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Datos del cliente</div>
          </div>
          <div
            className="card-body"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}
          >
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Razón social
              </div>
              <div>ELECTROMECÁNICA INDUSTRIAL SAC</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                RUC
              </div>
              <div className="mono-text">20458765432</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Dirección
              </div>
              <div>Av. Argentina 2456, Lima</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Email facturación
              </div>
              <div>cobranzas@electromecanica.pe</div>
            </div>
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">SUNAT · intentos de envío</div>
          </div>
          <div className="card-body col" style={{ gap: 8 }}>
            {[
              { ok: false, t: 'Intento 3', d: '24 abr · 18:42', err: '2335 — serie no autorizada' },
              { ok: false, t: 'Intento 2', d: '24 abr · 16:14', err: '2335 — serie no autorizada' },
              { ok: false, t: 'Intento 1', d: '24 abr · 14:08', err: '2335 — serie no autorizada' },
            ].map((a, i) => (
              <div
                key={i}
                className="row"
                style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 6 }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: 'var(--danger-soft)',
                    color: 'var(--danger-fg)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <I.x size={12} />
                </div>
                <div style={{ marginLeft: 8, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{a.t} · rechazado</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {a.d}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--danger-fg)' }}>{a.err}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">XML enviado</div>
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
              <I.download size={12} />
              Descargar
            </button>
          </div>
          <div className="card-body">
            <pre
              className="mono-text"
              style={{
                fontSize: 10.5,
                background: 'var(--bg-subtle)',
                padding: 10,
                borderRadius: 4,
                color: 'var(--fg-muted)',
                margin: 0,
                lineHeight: 1.5,
                overflow: 'hidden',
              }}
            >{`<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names...">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ID>F001-04808</cbc:ID>
  <cbc:IssueDate>2026-04-24</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>USD</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cbc:CustomerAssignedAccountID>
      20100123456
    </cbc:CustomerAssignedAccountID>
  ...`}</pre>
          </div>
        </div>
      </div>
    </div>
  </Screen>
);

window.FacturasList = FacturasList;
window.FacturaNueva = FacturaNueva;
window.FacturaDetalle = FacturaDetalle;
