/* DESIGN SYSTEM OVERVIEW — single artboard summarizing tokens & components */

const DSOverview = () => (
  <div style={{ width: 1280, padding: 40, background: 'var(--bg)', fontFamily: 'var(--ff-sans)' }}>
    {/* Header */}
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          fontFamily: 'var(--ff-mono)',
          fontSize: 11,
          color: 'var(--fg-faint)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          marginBottom: 8,
        }}
      >
        Sistema Orión · Design system v1
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>
        Tokens, componentes y patrones
      </h1>
      <div style={{ color: 'var(--fg-muted)', fontSize: 14, marginTop: 8, maxWidth: 720 }}>
        ERP B2B multi-tenant. Densidad alta, neutral con acento por tenant. shadcn/ui + Tailwind,
        Inter como tipografía única, Lucide para iconografía funcional.
      </div>
    </div>

    {/* Color tokens */}
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Color · acento por tenant</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { cls: 'tenant-idex', name: 'Idex', hex: '#0070f3', use: 'Conectores eléctricos' },
          { cls: 'tenant-agro', name: 'Agroalves', hex: '#16a34a', use: 'Agroquímicos' },
          { cls: 'tenant-dignita', name: 'Dignita', hex: '#7c3aed', use: '/admin · Plataforma' },
        ].map((t) => (
          <div key={t.name} className={`card ${t.cls}`} style={{ padding: 14 }}>
            <div className="row" style={{ gap: 12 }}>
              <div
                style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--accent)' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t.use}
                </div>
              </div>
              <span className="code" style={{ marginLeft: 'auto' }}>
                {t.hex}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
              <div style={{ flex: 1, height: 28, borderRadius: 4, background: 'var(--accent)' }} />
              <div
                style={{ flex: 1, height: 28, borderRadius: 4, background: 'var(--accent-soft)' }}
              />
              <div
                style={{ flex: 1, height: 28, borderRadius: 4, background: 'var(--accent-fg)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Neutrals + Semantic */}
    <section style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Neutrales (slate-cool)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            ['bg', '#ffffff'],
            ['bg-subtle', '#f8fafc'],
            ['bg-muted', '#f1f5f9'],
            ['border', '#e2e8f0'],
            ['fg-faint', '#94a3b8'],
            ['fg-subtle', '#64748b'],
            ['fg-muted', '#475569'],
            ['fg', '#0f172a'],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="swatch" style={{ background: v, marginBottom: 6 }} />
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--fg-muted)' }}>
                --{k}
              </div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--fg-faint)' }}>
                {v}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Semántica</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            ['success', '#16a34a', 'aprobada · ok'],
            ['info', '#0284c7', 'enviada · pendiente'],
            ['warn', '#ea580c', 'vencida · alerta'],
            ['danger', '#dc2626', 'rechazada · error'],
          ].map(([k, v, u]) => (
            <div key={k}>
              <div className="swatch" style={{ background: v, marginBottom: 6 }} />
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--fg-muted)' }}>
                --{k}
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-faint)' }}>{u}</div>
            </div>
          ))}
        </div>
        <div className="row" style={{ gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
          <Badge estado="borrador" />
          <Badge estado="enviada" />
          <Badge estado="aprobada" />
          <Badge estado="rechazada" />
          <Badge estado="vencida" />
          <Badge estado="anulada" />
          <Badge estado="convertida" />
        </div>
      </div>
    </section>

    {/* Typography + spacing */}
    <section style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Tipografía · Inter</h2>
        <div className="card" style={{ padding: 16 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 100px',
              gap: 8,
              alignItems: 'baseline',
            }}
          >
            {[
              ['Display 32', 32, 600, 'GRUPO IDEX SAC'],
              ['Title 22', 22, 600, 'Cotizaciones del mes'],
              ['Heading 16', 16, 600, 'Líneas del documento'],
              ['Body 13', 13, 400, 'Cliente persona jurídica con RUC válido SUNAT'],
              ['Label 12', 12, 500, 'Razón social'],
              ['Caption 11', 11, 500, 'COT-2026-00123 · vence en 5 días'],
              ['Mono 12', 12, 500, 'F001-00000123', 'mono'],
            ].map(([n, sz, w, sample, kind]) => (
              <React.Fragment key={n}>
                <div
                  style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--ff-mono)' }}
                >
                  {n}
                </div>
                <div
                  style={{
                    fontSize: sz,
                    fontWeight: w,
                    fontFamily: kind === 'mono' ? 'var(--ff-mono)' : 'var(--ff-sans)',
                    letterSpacing: sz > 20 ? '-.02em' : 0,
                  }}
                >
                  {sample}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--fg-faint)',
                    fontFamily: 'var(--ff-mono)',
                    textAlign: 'right',
                  }}
                >
                  {sz}/{w}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Spacing & radii</h2>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>
            Base 4px · Tailwind scale
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {[4, 8, 12, 16, 24, 32, 48, 64].map((s) => (
              <div key={s} style={{ textAlign: 'center' }}>
                <div
                  style={{ width: s, height: s, background: 'var(--accent)', borderRadius: 2 }}
                />
                <div
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 9,
                    color: 'var(--fg-faint)',
                    marginTop: 4,
                  }}
                >
                  {s}
                </div>
              </div>
            ))}
          </div>
          <div className="divider" style={{ margin: '16px 0' }} />
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>Radii</div>
          <div className="row" style={{ gap: 12 }}>
            {[
              ['sm', 4],
              ['md', 6],
              ['lg', 8],
              ['xl', 12],
            ].map(([n, r]) => (
              <div key={n} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: r,
                  }}
                />
                <div
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 9,
                    color: 'var(--fg-faint)',
                    marginTop: 4,
                  }}
                >
                  {r}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Components grid */}
    <section style={{ marginBottom: 32 }} className="tenant-idex">
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
        Componentes compartidos · 9
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {/* 1. Buttons */}
        <div className="card" style={{ padding: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              fontFamily: 'var(--ff-mono)',
              marginBottom: 8,
            }}
          >
            01 · Buttons
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <button className="btn btn-primary">
              <I.plus size={13} />
              Nueva
            </button>
            <button className="btn">Cancelar</button>
            <button className="btn btn-ghost">Ver más</button>
            <button className="btn btn-danger">
              <I.trash size={13} />
              Eliminar
            </button>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            <button className="btn btn-sm">Sm</button>
            <button className="btn">Md</button>
            <button className="btn btn-lg">Lg</button>
            <button className="btn" disabled>
              Disabled
            </button>
          </div>
        </div>

        {/* 2. Badges */}
        <div className="card" style={{ padding: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              fontFamily: 'var(--ff-mono)',
              marginBottom: 8,
            }}
          >
            02 · StatusBadge
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <Badge estado="borrador" />
            <Badge estado="enviada" />
            <Badge estado="aprobada" />
            <Badge estado="rechazada" />
            <Badge estado="vencida" />
            <Badge estado="anulada" />
          </div>
        </div>

        {/* 3. Money */}
        <div className="card" style={{ padding: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              fontFamily: 'var(--ff-mono)',
              marginBottom: 8,
            }}
          >
            03 · Money · 2/4 dp
          </div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            <Money value={1234.5678} dp={4} />
          </div>
          <div className="muted" style={{ fontSize: 11 }}>
            Precios de catálogo · 4 decimales
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>
            <Money value={42150.0} dp={2} />
          </div>
          <div className="muted" style={{ fontSize: 11 }}>
            Totales factura · 2 decimales
          </div>
        </div>

        {/* 4. Wizard */}
        <div className="card" style={{ padding: 0, gridColumn: 'span 2' }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              fontFamily: 'var(--ff-mono)',
              padding: '12px 16px 0',
            }}
          >
            04 · WizardSteps
          </div>
          <div style={{ padding: 12 }}>
            <Wizard steps={['Datos', 'Branding', 'Admin', 'Fiscal', 'Plan']} current={2} />
          </div>
        </div>

        {/* 5. Inputs */}
        <div className="card" style={{ padding: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              fontFamily: 'var(--ff-mono)',
              marginBottom: 8,
            }}
          >
            05 · Inputs
          </div>
          <div className="col" style={{ gap: 8 }}>
            <div className="field">
              <label className="label">
                RUC <span className="req">*</span>
              </label>
              <input className="input" defaultValue="20614847370" />
            </div>
            <div className="field">
              <label className="label">Razón social</label>
              <div className="input-prefix">
                <span className="prefix">
                  <I.building size={13} />
                </span>
                <input className="input" defaultValue="GRUPO IDEX SAC" />
              </div>
            </div>
          </div>
        </div>

        {/* 6. Tabs */}
        <div className="card" style={{ padding: 16, paddingBottom: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              fontFamily: 'var(--ff-mono)',
              marginBottom: 8,
            }}
          >
            06 · Tabs
          </div>
          <Tabs items={['Datos', 'Precios', 'Kardex', 'Ventas']} active={1} />
        </div>

        {/* 7. Timeline */}
        <div className="card" style={{ padding: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              fontFamily: 'var(--ff-mono)',
              marginBottom: 8,
            }}
          >
            07 · TimelineEvento
          </div>
          <div className="timeline">
            <div className="tl-item">
              <div className="tl-dot done" />
              <div className="tl-title">Creada</div>
              <div className="tl-meta">29 abr 2026 · 09:14</div>
            </div>
            <div className="tl-item">
              <div className="tl-dot active" />
              <div className="tl-title">En cola SUNAT</div>
              <div className="tl-meta">Hace 12 segundos</div>
            </div>
          </div>
        </div>

        {/* 8. Alerts */}
        <div className="card" style={{ padding: 16, gridColumn: 'span 2' }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              fontFamily: 'var(--ff-mono)',
              marginBottom: 8,
            }}
          >
            08 · Alerts
          </div>
          <div className="col" style={{ gap: 6 }}>
            <div className="alert alert-info">
              <I.alert size={14} />
              <span>El tipo de cambio se congeló al emitir la cotización (S/ 3.7420).</span>
            </div>
            <div className="alert alert-warn">
              <I.warn size={14} />
              <span>apis.net.pe no responde. Ingresá los datos manualmente.</span>
            </div>
            <div className="alert alert-danger">
              <I.x size={14} />
              <span>
                <strong>SUNAT 2335</strong> — el RUC del receptor no se encuentra activo.
              </span>
            </div>
          </div>
        </div>

        {/* 9. CommandPalette */}
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--fg-faint)',
              fontFamily: 'var(--ff-mono)',
              padding: '12px 16px 0',
            }}
          >
            09 · CommandPalette ⌘K
          </div>
          <div style={{ padding: 8 }}>
            <div
              className="row"
              style={{ padding: 8, gap: 8, borderBottom: '1px solid var(--border)' }}
            >
              <I.search size={14} className="muted" />
              <span className="muted" style={{ fontSize: 12 }}>
                terminal 50…
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--fg-faint)',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                padding: '8px 8px 4px',
              }}
            >
              Productos
            </div>
            <div className="row" style={{ padding: 6, fontSize: 12, gap: 8 }}>
              <I.package size={13} className="muted" />
              <span className="mono-text" style={{ fontSize: 11 }}>
                TER-50AWG-1/4
              </span>
              <span className="muted" style={{ fontSize: 11.5 }}>
                Terminal compresión 50AWG…
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Footer note */}
    <div
      style={{
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: 24,
        fontSize: 11,
        color: 'var(--fg-faint)',
      }}
    >
      <span>Inter · 11–32px</span>
      <span>JetBrains Mono · IDs, SKUs, RUCs</span>
      <span>Lucide React · 16px @ stroke 1.75</span>
      <span>Densidad: rows 36px · cards padding 16px</span>
    </div>
  </div>
);

window.DSOverview = DSOverview;
