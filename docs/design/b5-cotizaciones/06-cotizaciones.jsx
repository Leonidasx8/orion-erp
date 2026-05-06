/* Screens 14-16: Cotizaciones */

const CotizacionesList = () => (
  <Screen tenant="idex" active="cotizaciones" crumbs={['Idex', 'Cotizaciones']}>
    <PageHead
      title="Cotizaciones"
      subtitle="42 totales · 12 abiertas · USD 38.412 en pipeline"
      actions={
        <>
          <button className="btn">
            <I.download size={13} />
            Exportar
          </button>
          <button className="btn btn-primary">
            <I.plus size={13} />
            Nueva cotización
          </button>
        </>
      }
    />

    {/* Status filter pills */}
    <div className="row" style={{ marginBottom: 12, gap: 6, flexWrap: 'wrap' }}>
      {[
        { l: 'Todas', n: 42, active: true },
        { l: 'Borrador', n: 5 },
        { l: 'Enviadas', n: 7 },
        { l: 'Aprobadas', n: 3 },
        { l: 'Rechazadas', n: 2 },
        { l: 'Vencidas', n: 1 },
        { l: 'Convertidas', n: 24 },
      ].map((p, i) => (
        <button
          key={i}
          className="btn btn-sm"
          style={{
            background: p.active ? 'var(--accent-soft)' : 'var(--bg)',
            color: p.active ? 'var(--accent-fg)' : 'var(--fg-muted)',
            borderColor: p.active ? 'transparent' : 'var(--border)',
          }}
        >
          {p.l}{' '}
          <span className="muted" style={{ marginLeft: 4 }}>
            {p.n}
          </span>
        </button>
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
            placeholder="Buscar número, cliente…"
          />
        </div>
        <button className="btn btn-sm">
          <I.calendar size={12} />
          Fecha emisión
          <I.chev_d size={11} />
        </button>
        <button className="btn btn-sm">
          <I.user size={12} />
          Comercial
          <I.chev_d size={11} />
        </button>
        <button className="btn btn-sm">
          <I.users size={12} />
          Cliente
          <I.chev_d size={11} />
        </button>
      </div>
    </div>

    <div className="card-table card" style={{ borderRadius: '0 0 8px 8px', borderTop: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th className="check">
              <span className="checkbox" />
            </th>
            <th>Número</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Emisión</th>
            <th>Vence</th>
            <th className="num">Items</th>
            <th className="num">Total</th>
            <th>Comercial</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              'COT-2026-00132',
              'TECNOLOGÍA INDUSTRIAL SAC',
              'enviada',
              '27 abr',
              '30 abr',
              8,
              4218.4,
              'M. Quispe',
            ],
            [
              'COT-2026-00131',
              'ELECTROANDES SA',
              'borrador',
              '27 abr',
              '—',
              12,
              8412.5,
              'M. Quispe',
            ],
            [
              'COT-2026-00130',
              'GRUPO MINERA CERRO VERDE',
              'aprobada',
              '26 abr',
              '10 may',
              24,
              22150.5,
              'L. Escrivá',
            ],
            [
              'COT-2026-00129',
              'CONSTRUCTORA SUR EIRL',
              'enviada',
              '25 abr',
              '02 may',
              5,
              1840.2,
              'M. Quispe',
            ],
            [
              'COT-2026-00128',
              'ELECTROMECÁNICA INDUSTRIAL SAC',
              'enviada',
              '24 abr',
              '01 may',
              18,
              12480.0,
              'A. Salinas',
            ],
            [
              'COT-2026-00127',
              'TÉCNICA Y SERVICIOS SUR EIRL',
              'rechazada',
              '24 abr',
              '—',
              6,
              3210.0,
              'A. Salinas',
            ],
            [
              'COT-2026-00126',
              'INVERSIONES MARTÍNEZ',
              'vencida',
              '15 abr',
              '22 abr',
              3,
              890.0,
              'A. Salinas',
            ],
            [
              'COT-2026-00125',
              'GRUPO MINERA CERRO VERDE',
              'convertida',
              '12 abr',
              '—',
              32,
              38450.0,
              'L. Escrivá',
            ],
            [
              'COT-2026-00124',
              'ELECTROANDES SA',
              'convertida',
              '10 abr',
              '—',
              14,
              7820.5,
              'M. Quispe',
            ],
          ].map((r, i) => (
            <tr key={i}>
              <td>
                <span className="checkbox" />
              </td>
              <td className="mono-text" style={{ fontSize: 11.5 }}>
                {r[0]}
              </td>
              <td
                style={{
                  maxWidth: 220,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r[1]}
              </td>
              <td>
                <Badge estado={r[2]} />
              </td>
              <td className="muted">{r[3]}</td>
              <td
                className={r[2] === 'vencida' ? '' : 'muted'}
                style={{ color: r[2] === 'vencida' ? 'var(--warn-fg)' : undefined }}
              >
                {r[4]}
              </td>
              <td className="num">{r[5]}</td>
              <td className="num">
                <Money value={r[6]} dp={2} />
              </td>
              <td className="muted">{r[7]}</td>
              <td>
                <I.more size={14} className="muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card-foot">
        <span className="muted" style={{ fontSize: 12 }}>
          1–9 de 42
        </span>
        <div style={{ marginLeft: 'auto' }} className="row">
          <button className="btn btn-sm" disabled>
            <I.chev_l size={12} />
          </button>
          <button className="btn btn-sm">1</button>
          <button className="btn btn-sm btn-ghost">2</button>
          <button className="btn btn-sm btn-ghost">3</button>
          <button className="btn btn-sm">
            <I.chev_r size={12} />
          </button>
        </div>
      </div>
    </div>
  </Screen>
);

const CotizacionNueva = () => (
  <Screen tenant="idex" active="cotizaciones" crumbs={['Idex', 'Cotizaciones', 'Nueva']}>
    <div className="row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
      <div>
        <div className="row" style={{ gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            Nueva cotización
          </h1>
          <Badge estado="borrador" />
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          COT-2026-00133 · pre-asignado · 4 items · USD 4.218,40
        </div>
      </div>
      <div style={{ marginLeft: 'auto' }} className="row">
        <button className="btn">Cancelar</button>
        <button className="btn">Guardar borrador</button>
        <button className="btn btn-primary">
          <I.send size={13} />
          Enviar al cliente
        </button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
      {/* Left: cliente + lineas */}
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Cliente y términos</div>
          </div>
          <div
            className="card-body"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="label">
                Cliente <span className="req">*</span>
              </label>
              <div className="input-prefix">
                <span className="prefix">
                  <I.users size={13} />
                </span>
                <input className="input" defaultValue="ELECTROANDES SA" />
              </div>
              <div className="help">
                RUC 20100123456 · línea USD 50.000 · saldo USD 12.480 · plazo 30 días
              </div>
            </div>
            <div className="field">
              <label className="label">Fecha emisión</label>
              <input className="input" defaultValue="29 abr 2026" />
            </div>
            <div className="field">
              <label className="label">Vencimiento</label>
              <input className="input" defaultValue="13 may 2026" />
            </div>
            <div className="field">
              <label className="label">Moneda</label>
              <select className="select">
                <option>USD</option>
                <option>PEN</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Tipo cambio</label>
              <input className="input mono-text" defaultValue="3.7420" />
              <div className="help">SBS · 29 abr 2026 09:14</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">
              Líneas{' '}
              <span className="muted" style={{ fontSize: 11.5, fontWeight: 400, marginLeft: 6 }}>
                4 items
              </span>
            </div>
            <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
              <div
                className="row"
                style={{
                  height: 28,
                  padding: '0 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: 'var(--bg)',
                  minWidth: 220,
                }}
              >
                <I.search size={12} className="muted" />
                <input
                  className="input"
                  style={{
                    border: 0,
                    padding: 0,
                    height: 26,
                    background: 'transparent',
                    flex: 1,
                    fontSize: 12,
                  }}
                  placeholder="Agregar producto…"
                />
                <span className="kbd" style={{ marginLeft: 4 }}>
                  ⌘K
                </span>
              </div>
            </div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 24 }}></th>
                <th>SKU</th>
                <th>Descripción</th>
                <th className="num">Cant.</th>
                <th className="num">Precio</th>
                <th className="num">Margen</th>
                <th className="num">Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  sku: 'TER-50AWG-1/4',
                  d: 'Terminal compresión 1 hueco 50 AWG ¼"',
                  q: 5000,
                  pu: 0.1536,
                  m: 14.4,
                  st: 768.0,
                },
                {
                  sku: 'CAB-10AWG-NEG',
                  d: 'Cable cobre 10 AWG color negro 600V',
                  q: 200,
                  pu: 1.42,
                  m: 14.5,
                  st: 284.0,
                },
                {
                  sku: 'TER-70AWG-1/2',
                  d: 'Terminal compresión 1 hueco 70 AWG ½"',
                  q: 3000,
                  pu: 0.2148,
                  m: 12.7,
                  st: 644.4,
                  lowMargin: true,
                },
                {
                  sku: 'TUB-12-NEG',
                  d: 'Tubería termo-contractible 12mm',
                  q: 500,
                  pu: 0.48,
                  m: 14.3,
                  st: 240.0,
                },
              ].map((r, i) => (
                <tr key={i}>
                  <td>
                    <I.drag size={14} className="drag-handle" />
                  </td>
                  <td className="mono-text" style={{ fontSize: 11.5 }}>
                    {r.sku}
                  </td>
                  <td
                    style={{
                      maxWidth: 220,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r.d}
                  </td>
                  <td className="num">{r.q.toLocaleString('en-US')}</td>
                  <td className="num">
                    <Money value={r.pu} dp={4} />
                  </td>
                  <td className="num">
                    <span style={{ color: r.lowMargin ? 'var(--warn-fg)' : 'var(--fg)' }}>
                      {r.m}%
                    </span>
                    {r.lowMargin && (
                      <I.warn
                        size={11}
                        style={{ color: 'var(--warn)', marginLeft: 4, verticalAlign: 'middle' }}
                      />
                    )}
                  </td>
                  <td className="num">
                    <strong>
                      <Money value={r.st} dp={2} />
                    </strong>
                  </td>
                  <td>
                    <I.x size={13} className="muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="card-foot">
            <button className="btn btn-sm btn-ghost">
              <I.plus size={12} />
              Agregar línea manual
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Términos y observaciones</div>
          </div>
          <div
            className="card-body"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <div className="field">
              <label className="label">Términos de pago</label>
              <select className="select">
                <option>30 días desde emisión factura</option>
                <option>Contado</option>
                <option>50% adelanto · 50% entrega</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Tiempo de entrega</label>
              <input className="input" defaultValue="7 días hábiles" />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Observaciones (visibles en PDF)</label>
              <textarea
                className="textarea"
                rows={2}
                defaultValue="Precios incluyen instalación. No incluye traslado fuera de Lima Metropolitana."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: totals + margin */}
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Margen general</div>
          </div>
          <div className="card-body">
            <div className="row" style={{ gap: 6 }}>
              {['5%', '10%', '15%', 'Custom'].map((m, i) => (
                <button
                  key={i}
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: i === 1 ? 'var(--accent-soft)' : 'var(--bg)',
                    color: i === 1 ? 'var(--accent-fg)' : 'var(--fg)',
                    borderColor: i === 1 ? 'var(--accent)' : 'var(--border)',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="alert alert-warn" style={{ marginTop: 12 }}>
              <I.warn size={14} />
              <div>
                <div style={{ fontWeight: 500 }}>1 línea por debajo del margen mínimo</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>
                  TER-70AWG-1/2: 12,7% &lt; 13% (mínimo configurado)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Totales</div>
          </div>
          <div className="card-body col" style={{ gap: 8 }}>
            {[
              ['Subtotal', 1936.4, false],
              ['Descuento (0%)', 0, false],
              ['Base IGV', 1936.4, false],
              ['IGV 18%', 348.55, false],
            ].map(([k, v], i) => (
              <div className="row" key={i} style={{ fontSize: 12.5 }}>
                <span className="muted">{k}</span>
                <span className="num" style={{ marginLeft: 'auto' }}>
                  <Money value={v} dp={2} />
                </span>
              </div>
            ))}
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="row">
              <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
              <span className="num" style={{ marginLeft: 'auto', fontSize: 18, fontWeight: 600 }}>
                <Money value={2284.95} dp={2} />
              </span>
            </div>
            <div className="muted" style={{ fontSize: 11.5, textAlign: 'right' }}>
              ≈ S/ 8.550,29 al tipo de cambio
            </div>
          </div>
          <div className="divider" />
          <div className="card-body" style={{ paddingTop: 12, fontSize: 12 }}>
            <div className="row">
              <span className="muted">Costo total</span>
              <span className="num" style={{ marginLeft: 'auto' }}>
                <Money value={1693.4} dp={2} />
              </span>
            </div>
            <div className="row" style={{ marginTop: 4 }}>
              <span className="muted">Utilidad bruta</span>
              <span
                className="num"
                style={{ marginLeft: 'auto', color: 'var(--success-fg)', fontWeight: 600 }}
              >
                <Money value={243.0} dp={2} />
              </span>
            </div>
            <div className="row" style={{ marginTop: 4 }}>
              <span className="muted">Margen consolidado</span>
              <span style={{ marginLeft: 'auto', color: 'var(--success-fg)', fontWeight: 600 }}>
                14,3%
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Vista previa PDF</div>
            <I.external size={13} className="muted" style={{ marginLeft: 'auto' }} />
          </div>
          <div className="card-body">
            <div
              style={{
                aspectRatio: '8.5/11',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                padding: 12,
              }}
            >
              <div className="row" style={{ marginBottom: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  IX
                </div>
                <div className="sk" style={{ width: 80, height: 8, marginLeft: 6 }} />
                <div className="mono-text" style={{ marginLeft: 'auto', fontSize: 8 }}>
                  COT-2026-00133
                </div>
              </div>
              {[60, 40, 80, 30, 70, 50, 90, 40, 60, 80, 40].map((w, i) => (
                <div
                  key={i}
                  className="sk"
                  style={{ width: `${w}%`, height: 5, marginBottom: 4 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Screen>
);

const CotizacionDetalle = () => (
  <Screen tenant="idex" active="cotizaciones" crumbs={['Idex', 'Cotizaciones', 'COT-2026-00132']}>
    <div className="row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
      <div>
        <div className="row" style={{ gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            COT-2026-00132
          </h1>
          <Badge estado="enviada" />
          <span className="tag">
            <I.clock size={11} />
            vence en 1 día
          </span>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          TECNOLOGÍA INDUSTRIAL SAC · emitida 27 abr 2026 · USD 4.218,40 · 8 items · M. Quispe
        </div>
      </div>
      <div style={{ marginLeft: 'auto' }} className="row">
        <button className="btn">
          <I.pdf size={13} />
          PDF
        </button>
        <button className="btn">
          <I.send size={13} />
          Reenviar email
        </button>
        <button className="btn">
          <I.copy size={13} />
          Duplicar
        </button>
        {/* Estado=enviada → [Aprobar] [Rechazar] */}
        <button className="btn btn-danger">Rechazar</button>
        <button className="btn btn-primary">
          <I.check size={13} />
          Aprobar
        </button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Líneas · 8 items</div>
            <span className="muted" style={{ marginLeft: 'auto', fontSize: 11.5 }}>
              Solo lectura · cotización enviada
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
                ['TER-25AWG-3/8', 'Terminal compresión 1 hueco 25 AWG ⅜"', 2000, 0.0987, 197.4],
                ['TER-70AWG-1/2', 'Terminal compresión 1 hueco 70 AWG ½"', 3000, 0.2148, 644.4],
                ['CAB-10AWG-NEG', 'Cable cobre 10 AWG color negro 600V', 200, 1.42, 284.0],
                ['CAB-14AWG-AZU', 'Cable cobre 14 AWG color azul 600V', 150, 0.79, 118.5],
                ['TUB-12-NEG', 'Tubería termo-contractible 12mm', 500, 0.48, 240.0],
                ['TER-95AWG-1/2', 'Terminal compresión 1 hueco 95 AWG ½"', 800, 0.289, 231.2],
                ['TER-120AWG-5/8', 'Terminal compresión 1 hueco 120 AWG ⅝"', 1500, 0.3712, 556.8],
              ].map((r, i) => (
                <tr key={i} className="tight-row">
                  <td className="mono-text" style={{ fontSize: 11.5 }}>
                    {r[0]}
                  </td>
                  <td
                    style={{
                      maxWidth: 280,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r[1]}
                  </td>
                  <td className="num">{r[2].toLocaleString('en-US')}</td>
                  <td className="num">
                    <Money value={r[3]} dp={4} />
                  </td>
                  <td className="num">
                    <Money value={r[4]} dp={2} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Términos</div>
          </div>
          <div
            className="card-body"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}
          >
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Pago
              </div>
              <div>30 días desde emisión factura</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Entrega
              </div>
              <div>7 días hábiles</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Moneda
              </div>
              <div>USD · TC S/ 3,7420</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Validez
              </div>
              <div>14 días desde emisión</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="muted" style={{ fontSize: 11 }}>
                Observaciones
              </div>
              <div>
                Precios incluyen instalación. No incluye traslado fuera de Lima Metropolitana.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Totales</div>
          </div>
          <div className="card-body col" style={{ gap: 8, fontSize: 12.5 }}>
            <div className="row">
              <span className="muted">Subtotal</span>
              <span className="num" style={{ marginLeft: 'auto' }}>
                <Money value={3574.91} dp={2} />
              </span>
            </div>
            <div className="row">
              <span className="muted">IGV 18%</span>
              <span className="num" style={{ marginLeft: 'auto' }}>
                <Money value={643.49} dp={2} />
              </span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="row">
              <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
              <span className="num" style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 600 }}>
                <Money value={4218.4} dp={2} />
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Línea de tiempo</div>
          </div>
          <div className="card-body">
            <div className="timeline">
              {[
                { dot: 'done', t: 'Creada en borrador', m: 'M. Quispe · 27 abr 2026 · 09:14' },
                { dot: 'done', t: 'PDF generado', m: 'v1 · 27 abr 2026 · 09:18' },
                {
                  dot: 'done',
                  t: 'Enviada al cliente',
                  m: 'compras@tec-industrial.pe · 27 abr · 09:20',
                },
                { dot: 'done', t: 'Cliente abrió el correo', m: '27 abr 2026 · 11:42' },
                {
                  dot: 'active',
                  t: 'Esperando respuesta del cliente',
                  m: 'vence mañana 30 abr · enviar recordatorio',
                },
              ].map((e, i) => (
                <div key={i} className="tl-item">
                  <div className={`tl-dot ${e.dot}`} />
                  <div className="tl-title">{e.t}</div>
                  <div className="tl-meta">{e.m}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card-foot">
            <button className="btn btn-sm btn-ghost">
              <I.bell size={12} />
              Enviar recordatorio
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Conversiones disponibles</div>
          </div>
          <div className="card-body col" style={{ gap: 8 }}>
            <div
              className="row"
              style={{
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 6,
                opacity: 0.5,
              }}
            >
              <I.invoice size={16} className="muted" />
              <div style={{ flex: 1, marginLeft: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>Convertir a factura</div>
                <div className="muted" style={{ fontSize: 11 }}>
                  Disponible cuando esté aprobada
                </div>
              </div>
            </div>
            <div
              className="row"
              style={{
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 6,
                opacity: 0.5,
              }}
            >
              <I.inbox size={16} className="muted" />
              <div style={{ flex: 1, marginLeft: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>Convertir a orden de compra</div>
                <div className="muted" style={{ fontSize: 11 }}>
                  Disponible cuando esté aprobada
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Screen>
);

window.CotizacionesList = CotizacionesList;
window.CotizacionNueva = CotizacionNueva;
window.CotizacionDetalle = CotizacionDetalle;
