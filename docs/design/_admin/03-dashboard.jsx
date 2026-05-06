/* Screen 7: Tenant dashboard (Idex) */

const TenantDashboard = () => (
  <Screen tenant="idex" active="dashboard" crumbs={['Idex', 'Dashboard']}>
    <PageHead
      title="Buen día, Lucas"
      subtitle="Resumen del 29 abr 2026 · cierra mes en 1 día"
      actions={
        <>
          <button className="btn">
            <I.calendar size={13} />
            Mes en curso
            <I.chev_d size={12} />
          </button>
          <button className="btn btn-primary">
            <I.plus size={13} />
            Nueva cotización
          </button>
        </>
      }
    />

    {/* 6 KPIs */}
    <div className="kpi-row">
      <div className="kpi">
        <div className="kpi-label">
          <I.invoice size={12} />
          Ventas mes
        </div>
        <div className="kpi-value">
          <Money value={48231.2} dp={0} />
        </div>
        <div className="kpi-delta up">
          <I.arrow_up size={11} />
          +18,4% vs marzo
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">
          <I.doc_text size={12} />
          Cotizaciones
        </div>
        <div className="kpi-value">
          42{' '}
          <span style={{ fontSize: 12, color: 'var(--fg-faint)', fontWeight: 400 }}>
            · 12 abiertas
          </span>
        </div>
        <div className="kpi-delta" style={{ color: 'var(--info-fg)' }}>
          <I.dot size={8} />
          USD 38.412 en pipeline
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">
          <I.wallet size={12} />
          CxC vencido
        </div>
        <div className="kpi-value" style={{ color: 'var(--warn-fg)' }}>
          <Money value={5840.5} dp={2} />
        </div>
        <div className="kpi-delta down">
          <I.arrow_dn size={11} />3 facturas &gt; 30 días
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">
          <I.layers size={12} />
          Stock crítico
        </div>
        <div className="kpi-value">
          7 <span style={{ fontSize: 12, color: 'var(--fg-faint)', fontWeight: 400 }}>SKUs</span>
        </div>
        <div className="kpi-delta" style={{ color: 'var(--warn-fg)' }}>
          <I.warn size={11} />
          bajo umbral mínimo
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">
          <I.bolt size={12} />
          SUNAT (mes)
        </div>
        <div className="kpi-value">
          187{' '}
          <span style={{ fontSize: 12, color: 'var(--fg-faint)', fontWeight: 400 }}>aceptadas</span>
        </div>
        <div className="kpi-delta up">
          <I.check size={11} />
          100% sin rechazo
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">
          <I.users size={12} />
          Clientes activos
        </div>
        <div className="kpi-value">94</div>
        <div className="kpi-delta up">
          <I.arrow_up size={11} />
          +5 este mes
        </div>
      </div>
    </div>

    {/* Charts */}
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginTop: 16 }}>
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Ventas · 12 meses</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
              USD · facturas aceptadas SUNAT
            </div>
          </div>
          <div className="row" style={{ marginLeft: 'auto', gap: 4 }}>
            <button className="btn btn-sm btn-ghost">Mes</button>
            <button className="btn btn-sm" style={{ background: 'var(--bg-muted)' }}>
              Trimestre
            </button>
            <button className="btn btn-sm btn-ghost">Año</button>
          </div>
        </div>
        <div className="card-body">
          <BarChart
            color="var(--accent)"
            height={180}
            data={[28, 32, 30, 38, 42, 35, 46, 52, 48, 55, 58, 48]}
            labels={[
              'May',
              'Jun',
              'Jul',
              'Ago',
              'Sep',
              'Oct',
              'Nov',
              'Dic',
              'Ene',
              'Feb',
              'Mar',
              'Abr',
            ]}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Pipeline cotizaciones</div>
        </div>
        <div className="card-body">
          {[
            { est: 'borrador', count: 5, val: 8420, pct: 18 },
            { est: 'enviada', count: 7, val: 18415, pct: 42 },
            { est: 'aprobada', count: 3, val: 11577, pct: 30 },
            { est: 'rechazada', count: 2, val: 0, pct: 5 },
            { est: 'vencida', count: 1, val: 0, pct: 5 },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div className="row" style={{ marginBottom: 4 }}>
                <Badge estado={s.est} />
                <span className="muted" style={{ fontSize: 11.5, marginLeft: 6 }}>
                  {s.count} cot.
                </span>
                <span className="mono-text" style={{ marginLeft: 'auto', fontSize: 12 }}>
                  {s.val ? `USD ${s.val.toLocaleString('en-US')}` : '—'}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--bg-muted)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${s.pct}%`,
                    background:
                      s.est === 'aprobada'
                        ? 'var(--success)'
                        : s.est === 'enviada'
                          ? 'var(--info)'
                          : s.est === 'rechazada'
                            ? 'var(--danger)'
                            : s.est === 'vencida'
                              ? 'var(--warn)'
                              : 'var(--fg-faint)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* 2 lists */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Cotizaciones por aprobar</div>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
            Ver todas
            <I.arrow_r size={12} />
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th className="num">Total</th>
              <th>Vence</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['COT-2026-00132', 'TECNOLOGÍA INDUSTRIAL SAC', 4218.4, 'mañana'],
              ['COT-2026-00128', 'ELECTROANDES SA', 12480.0, '3 días'],
              ['COT-2026-00125', 'GRUPO MINERA CERRO VERDE', 22150.5, '5 días'],
              ['COT-2026-00121', 'CONSTRUCTORA SUR EIRL', 1840.2, '7 días'],
            ].map((r, i) => (
              <tr key={i} className="tight-row">
                <td className="mono-text" style={{ fontSize: 11.5 }}>
                  {r[0]}
                </td>
                <td
                  style={{
                    maxWidth: 180,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r[1]}
                </td>
                <td className="num">
                  <Money value={r[2]} dp={2} />
                </td>
                <td>
                  <span
                    className={i === 0 ? 'tag' : 'muted'}
                    style={{
                      fontSize: 11,
                      color: i === 0 ? 'var(--warn-fg)' : undefined,
                      background: i === 0 ? 'var(--warn-soft)' : undefined,
                    }}
                  >
                    {r[3]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Stock crítico</div>
          <span className="badge badge-vencida" style={{ marginLeft: 'auto' }}>
            <span className="dot" />7 SKUs
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th className="num">Stock</th>
              <th className="num">Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['TER-50AWG-1/4', 'Terminal compresión 50AWG ¼"', 3, 20],
              ['CAB-10AWG-NEG', 'Cable cobre 10 AWG negro 600V', 28, 100],
              ['TER-25AWG-3/8', 'Terminal compresión 25AWG ⅜"', 0, 15],
              ['TUB-12-NEG', 'Tubería termo-contractible 12mm', 12, 40],
              ['CAB-14AWG-AZU', 'Cable cobre 14 AWG azul 600V', 45, 80],
            ].map((r, i) => (
              <tr key={i} className="tight-row">
                <td className="mono-text" style={{ fontSize: 11.5 }}>
                  {r[0]}
                </td>
                <td
                  style={{
                    maxWidth: 200,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r[1]}
                </td>
                <td
                  className="num"
                  style={{
                    color: r[2] === 0 ? 'var(--danger-fg)' : 'var(--warn-fg)',
                    fontWeight: 600,
                  }}
                >
                  {r[2]}
                </td>
                <td className="num muted">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </Screen>
);

window.TenantDashboard = TenantDashboard;
