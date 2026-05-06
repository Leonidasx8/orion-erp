/* Screens 17-19: Inventario + Guías */

const InventarioKardex = () => (
  <Screen tenant="idex" active="inventario" crumbs={['Idex', 'Inventario', 'Kardex']}>
    <PageHead
      title="Kardex · TER-50AWG-1/4"
      subtitle='Terminal compresión 1 hueco 50 AWG agujero ¼" · método PEPS'
      actions={
        <>
          <button className="btn">
            <I.download size={13} />
            Exportar Kardex
          </button>
          <button className="btn">
            <I.adjust size={13} />
            Ajuste manual
          </button>
        </>
      }
    />

    {/* KPI strip */}
    <div
      style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}
    >
      {[
        { l: 'Stock actual', v: '3', sub: 'unidades', tone: 'warn' },
        { l: 'Stock mínimo', v: '20', sub: 'configurado' },
        { l: 'Costo promedio', v: '$0,1289', sub: 'PEPS' },
        { l: 'Valor inventario', v: '$0,39', sub: 'al cierre' },
        { l: 'Rotación 30d', v: '4,2x', sub: '120 u. salidas', tone: 'good' },
      ].map((k, i) => (
        <div key={i} className="card" style={{ padding: 14 }}>
          <div
            className="muted"
            style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}
          >
            {k.l}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              marginTop: 4,
              color:
                k.tone === 'warn'
                  ? 'var(--warn-fg)'
                  : k.tone === 'good'
                    ? 'var(--success-fg)'
                    : 'var(--fg)',
            }}
          >
            {k.v}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
            {k.sub}
          </div>
        </div>
      ))}
    </div>

    <div className="alert alert-warn" style={{ marginBottom: 16 }}>
      <I.warn size={14} />
      <div>
        <div style={{ fontWeight: 500 }}>Stock por debajo del mínimo</div>
        <div style={{ fontSize: 11.5, marginTop: 2 }}>
          Quedan 3 unidades · mínimo 20 · al ritmo actual de venta se agota en 1,2 días.
        </div>
      </div>
      <button className="btn btn-sm" style={{ marginLeft: 'auto' }}>
        <I.inbox size={12} />
        Crear orden a SegElectrica
      </button>
    </div>

    <div className="card-table card" style={{ borderRadius: 8 }}>
      <div className="card-head">
        <div className="card-title">Movimientos · últimos 30 días</div>
        <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
          <button
            className="btn btn-sm"
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent-fg)',
              borderColor: 'transparent',
            }}
          >
            Todos
          </button>
          <button className="btn btn-sm btn-ghost">Entradas</button>
          <button className="btn btn-sm btn-ghost">Salidas</button>
          <button className="btn btn-sm btn-ghost">Ajustes</button>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Documento</th>
            <th>Detalle</th>
            <th className="num">Entrada</th>
            <th className="num">Salida</th>
            <th className="num">Saldo</th>
            <th className="num">Costo unit.</th>
            <th>Usuario</th>
          </tr>
        </thead>
        <tbody>
          {[
            [
              '28 abr',
              'salida',
              'GR-2026-00845',
              'Despacho a CONSTRUCTORA SUR EIRL',
              '',
              12,
              3,
              0.1289,
              'M. Quispe',
            ],
            [
              '27 abr',
              'salida',
              'GR-2026-00844',
              'Despacho a TECNOLOGÍA INDUSTRIAL',
              '',
              8,
              15,
              0.1289,
              'M. Quispe',
            ],
            [
              '25 abr',
              'salida',
              'GR-2026-00842',
              'Despacho a ELECTROANDES SA',
              '',
              25,
              23,
              0.1289,
              'M. Quispe',
            ],
            [
              '22 abr',
              'entrada',
              'OC-2026-0089',
              'Recepción SegElectrica · lote L-5512',
              50,
              '',
              48,
              0.1342,
              'A. Salinas',
            ],
            [
              '18 abr',
              'salida',
              'GR-2026-00838',
              'Despacho a GRUPO MINERA CERRO VERDE',
              '',
              32,
              '-2',
              0.1289,
              'M. Quispe',
            ],
            [
              '18 abr',
              'ajuste',
              'AJ-2026-00012',
              'Ajuste por inventario físico',
              2,
              '',
              30,
              0.1289,
              'L. Escrivá',
            ],
            [
              '12 abr',
              'salida',
              'GR-2026-00833',
              'Despacho a ELECTROMECÁNICA',
              '',
              18,
              28,
              0.1289,
              'A. Salinas',
            ],
            [
              '08 abr',
              'salida',
              'GR-2026-00829',
              'Despacho a ELECTROANDES SA',
              '',
              40,
              46,
              0.1289,
              'M. Quispe',
            ],
            [
              '01 abr',
              'entrada',
              'OC-2026-0082',
              'Recepción SegElectrica · lote L-5489',
              80,
              '',
              86,
              0.1289,
              'A. Salinas',
            ],
          ].map((r, i) => {
            const tipo = r[1];
            const tipoTag =
              tipo === 'entrada' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--success-fg)',
                    fontSize: 11.5,
                  }}
                >
                  <I.arrow_dr size={12} />
                  Entrada
                </span>
              ) : tipo === 'salida' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--danger-fg)',
                    fontSize: 11.5,
                  }}
                >
                  <I.arrow_up size={12} />
                  Salida
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--accent-fg)',
                    fontSize: 11.5,
                  }}
                >
                  <I.adjust size={12} />
                  Ajuste
                </span>
              );
            return (
              <tr key={i} className="tight-row">
                <td className="muted">{r[0]}</td>
                <td>{tipoTag}</td>
                <td className="mono-text" style={{ fontSize: 11.5, color: 'var(--accent-fg)' }}>
                  {r[2]}
                </td>
                <td
                  style={{
                    maxWidth: 260,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r[3]}
                </td>
                <td
                  className="num"
                  style={{ color: r[4] ? 'var(--success-fg)' : 'var(--fg-muted)' }}
                >
                  {r[4] || '—'}
                </td>
                <td
                  className="num"
                  style={{ color: r[5] ? 'var(--danger-fg)' : 'var(--fg-muted)' }}
                >
                  {r[5] || '—'}
                </td>
                <td className="num">
                  <strong>{r[6]}</strong>
                </td>
                <td className="num mono-text" style={{ fontSize: 11.5 }}>
                  <Money value={r[7]} dp={4} />
                </td>
                <td className="muted">{r[8]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Screen>
);

const InventarioAjuste = () => (
  <Screen tenant="idex" active="inventario" crumbs={['Idex', 'Inventario', 'Ajuste']}>
    <PageHead
      title="Ajuste manual de inventario"
      subtitle="Requiere motivo · genera auditoría · Superadmin"
    />

    <div className="alert alert-danger" style={{ marginBottom: 16 }}>
      <I.shield size={14} />
      <div>
        <div style={{ fontWeight: 500 }}>Acción crítica · queda registrada permanentemente</div>
        <div style={{ fontSize: 11.5, marginTop: 2 }}>
          Los ajustes manuales generan una entrada en auditoría con fecha, usuario, IP, motivo y
          valor. No son reversibles desde la UI.
        </div>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Detalle del ajuste</div>
        </div>
        <div
          className="card-body"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        >
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label className="label">
              Producto <span className="req">*</span>
            </label>
            <div className="input-prefix">
              <span className="prefix">
                <I.package size={13} />
              </span>
              <input
                className="input"
                defaultValue='TER-50AWG-1/4 — Terminal compresión 1 hueco 50 AWG ¼"'
              />
            </div>
            <div className="help">Stock actual: 3 unidades · costo promedio $0,1289</div>
          </div>

          <div className="field">
            <label className="label">
              Tipo de ajuste <span className="req">*</span>
            </label>
            <select className="select">
              <option>Entrada (+)</option>
              <option>Salida (−)</option>
              <option>Reemplazar saldo</option>
            </select>
          </div>
          <div className="field">
            <label className="label">
              Cantidad <span className="req">*</span>
            </label>
            <input className="input mono-text" defaultValue="2" />
          </div>

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label className="label">
              Motivo <span className="req">*</span>
            </label>
            <select className="select">
              <option>Diferencia por inventario físico</option>
              <option>Producto dañado / merma</option>
              <option>Devolución sin documento</option>
              <option>Corrección de error operativo</option>
              <option>Otro (especificar)</option>
            </select>
          </div>

          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label className="label">
              Comentario adicional <span className="req">*</span>
            </label>
            <textarea
              className="textarea"
              rows={3}
              defaultValue="Inventario físico realizado el 18/04. Diferencia de +2 unidades respecto al sistema, atribuible a una recepción parcial registrada el 01/04 que dejó 2 unidades fuera del conteo. Validado contra lote L-5489."
            />
            <div className="help">Mínimo 30 caracteres · será visible en auditoría</div>
          </div>
        </div>
        <div className="card-foot">
          <button className="btn">Cancelar</button>
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }}>
            <I.shield size={13} />
            Confirmar ajuste
          </button>
        </div>
      </div>

      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Vista previa</div>
          </div>
          <div className="card-body col" style={{ gap: 10, fontSize: 12.5 }}>
            <div className="row">
              <span className="muted">Stock antes</span>
              <span className="num" style={{ marginLeft: 'auto' }}>
                3 u.
              </span>
            </div>
            <div className="row">
              <span className="muted">Movimiento</span>
              <span className="num" style={{ marginLeft: 'auto', color: 'var(--success-fg)' }}>
                +2 u.
              </span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="row">
              <span style={{ fontWeight: 600 }}>Stock después</span>
              <span className="num" style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 600 }}>
                5 u.
              </span>
            </div>
            <div className="divider" style={{ margin: '4px 0' }} />
            <div className="row">
              <span className="muted">Valor antes</span>
              <span className="num" style={{ marginLeft: 'auto' }}>
                <Money value={0.39} dp={2} />
              </span>
            </div>
            <div className="row">
              <span className="muted">Valor después</span>
              <span className="num" style={{ marginLeft: 'auto' }}>
                <Money value={0.64} dp={2} />
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Quedará registrado en auditoría</div>
          </div>
          <div className="card-body" style={{ fontSize: 12 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <Avatar size={28} initials="LE" />
              <div style={{ marginLeft: 8 }}>
                <div style={{ fontWeight: 500 }}>
                  Lucas Escrivá{' '}
                  <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>
                    · Superadmin
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  192.168.1.42 · Chrome 138 · Lima, PE
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                  29 abr 2026 · 14:23
                </div>
              </div>
            </div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div
              className="mono-text"
              style={{
                fontSize: 11,
                background: 'var(--bg-subtle)',
                padding: 8,
                borderRadius: 4,
                color: 'var(--fg-muted)',
              }}
            >
              event: inventory.adjust
              <br />
              product: TER-50AWG-1/4
              <br />
              delta: +2
              <br />
              reason: physical_count_diff
              <br />
              prev_stock: 3 → 5
            </div>
          </div>
        </div>
      </div>
    </div>
  </Screen>
);

const GuiaRemision = () => (
  <Screen tenant="idex" active="guias" crumbs={['Idex', 'Guías de remisión', 'GR-2026-00845']}>
    <div className="row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
      <div>
        <div className="row" style={{ gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            GR-2026-00845
          </h1>
          <Badge estado="enviada" />
          <span
            className="tag"
            style={{ background: 'var(--success-soft)', color: 'var(--success-fg)' }}
          >
            <I.check size={11} />
            Aceptada SUNAT
          </span>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          T001-00845 · CONSTRUCTORA SUR EIRL · emitida 28 abr 2026 · transporte propio
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
          <I.print size={13} />
          Imprimir
        </button>
        <button className="btn btn-danger">Anular</button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Datos del traslado</div>
          </div>
          <div
            className="card-body"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12.5 }}
          >
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Motivo de traslado
              </div>
              <div>Venta · OP-2026-0312</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Modalidad
              </div>
              <div>Transporte propio</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Fecha emisión
              </div>
              <div>28 abr 2026 · 16:32</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Fecha traslado
              </div>
              <div>29 abr 2026 · 08:00</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }} className="divider" />
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Punto de partida
              </div>
              <div>Av. Argentina 4587, Cercado de Lima</div>
              <div className="muted" style={{ fontSize: 11 }}>
                Almacén Lima · Idex SAC
              </div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Punto de llegada
              </div>
              <div>Calle Las Acacias 230, Surco</div>
              <div className="muted" style={{ fontSize: 11 }}>
                Obra: Edificio Acacia · CONSTRUCTORA SUR EIRL
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Vehículo y conductor</div>
          </div>
          <div
            className="card-body"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}
          >
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Placa
              </div>
              <div className="mono-text">ABT-329</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Marca / modelo
              </div>
              <div>Hyundai HD-65</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                Conductor
              </div>
              <div>Pedro Atauche Mamani</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 11 }}>
                DNI · licencia
              </div>
              <div className="mono-text">42819307 · Q-42819307</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Productos despachados · 5 ítems</div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Descripción</th>
                <th>Lote</th>
                <th className="num">Cant.</th>
                <th>UM</th>
                <th className="num">Peso</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'TER-50AWG-1/4',
                  'Terminal compresión 1 hueco 50 AWG ¼"',
                  'L-5512',
                  12,
                  'NIU',
                  0.42,
                ],
                [
                  'TER-70AWG-1/2',
                  'Terminal compresión 1 hueco 70 AWG ½"',
                  'L-5489',
                  8,
                  'NIU',
                  0.38,
                ],
                ['CAB-10AWG-NEG', 'Cable cobre 10 AWG color negro 600V', '—', 50, 'MTR', 12.5],
                ['CAB-14AWG-AZU', 'Cable cobre 14 AWG color azul 600V', '—', 30, 'MTR', 4.8],
                ['TUB-12-NEG', 'Tubería termo-contractible 12mm', 'L-3201', 100, 'MTR', 1.2],
              ].map((r, i) => (
                <tr key={i} className="tight-row">
                  <td className="mono-text" style={{ fontSize: 11.5 }}>
                    {r[0]}
                  </td>
                  <td
                    style={{
                      maxWidth: 240,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {r[1]}
                  </td>
                  <td className="muted mono-text" style={{ fontSize: 11.5 }}>
                    {r[2]}
                  </td>
                  <td className="num">{r[3]}</td>
                  <td className="muted">{r[4]}</td>
                  <td className="num">{r[5]} kg</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--bg-subtle)' }}>
                <td colSpan={3} className="muted" style={{ fontWeight: 500 }}>
                  Total
                </td>
                <td className="num" style={{ fontWeight: 600 }}>
                  200
                </td>
                <td></td>
                <td className="num" style={{ fontWeight: 600 }}>
                  19,30 kg
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Estado SUNAT</div>
          </div>
          <div className="card-body">
            <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: 'var(--success-soft)',
                  color: 'var(--success-fg)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <I.check size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>Aceptada por SUNAT</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  Código 0 · 28 abr 2026 · 16:34:12
                </div>
              </div>
            </div>
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="col" style={{ gap: 6, fontSize: 12 }}>
              <div className="row">
                <span className="muted">Hash documento</span>
              </div>
              <div
                className="mono-text"
                style={{
                  fontSize: 10.5,
                  background: 'var(--bg-subtle)',
                  padding: 6,
                  borderRadius: 4,
                  wordBreak: 'break-all',
                }}
              >
                a3f8b291e4c7d05f9b1e2a8c4d6f3e1b2a8c4d6f
              </div>
              <div className="row" style={{ marginTop: 4 }}>
                <span className="muted">CDR descargado</span>
                <span className="num" style={{ marginLeft: 'auto' }}>
                  R-20100123456-09-T001-00845.zip
                </span>
              </div>
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
                {
                  dot: 'done',
                  t: 'Guía generada desde OP-2026-0312',
                  m: 'M. Quispe · 28 abr 16:30',
                },
                { dot: 'done', t: 'XML firmado y enviado a SUNAT', m: '28 abr · 16:33:48' },
                { dot: 'done', t: 'CDR recibido · aceptado', m: '28 abr · 16:34:12' },
                {
                  dot: 'done',
                  t: 'PDF enviado al cliente',
                  m: 'compras@constructora-sur.pe · 28 abr 16:36',
                },
                { dot: 'active', t: 'En tránsito', m: 'salida 29 abr 08:00 · ETA 09:30' },
              ].map((e, i) => (
                <div key={i} className="tl-item">
                  <div className={`tl-dot ${e.dot}`} />
                  <div className="tl-title">{e.t}</div>
                  <div className="tl-meta">{e.m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Documentos relacionados</div>
          </div>
          <div className="card-body col" style={{ gap: 6, fontSize: 12 }}>
            {[
              ['OP-2026-0312', 'Orden de pedido'],
              ['COT-2026-00128', 'Cotización origen'],
              ['F001-04812', 'Factura asociada'],
            ].map(([n, l]) => (
              <div
                key={n}
                className="row"
                style={{ padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
              >
                <I.doc_text size={14} className="muted" />
                <div style={{ marginLeft: 8 }}>
                  <div className="mono-text" style={{ fontSize: 11.5, color: 'var(--accent-fg)' }}>
                    {n}
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {l}
                  </div>
                </div>
                <I.external size={12} className="muted" style={{ marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </Screen>
);

window.InventarioKardex = InventarioKardex;
window.InventarioAjuste = InventarioAjuste;
window.GuiaRemision = GuiaRemision;
