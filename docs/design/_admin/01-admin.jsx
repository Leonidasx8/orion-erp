/* Screens 1-3: Admin Dignita */

const AdminDashboard = () => (
  <Screen
    tenant="dignita"
    active="dashboard"
    crumbs={['Plataforma', 'Dashboard']}
    userName="Leonidas Yauri"
  >
    <PageHead
      title="Plataforma Orión"
      subtitle="Vista global · 2 tenants activos · 12 usuarios totales"
      actions={
        <>
          <button className="btn">
            <I.download size={13} />
            Exportar métricas
          </button>
          <button className="btn btn-primary">
            <I.plus size={13} />
            Nuevo tenant
          </button>
        </>
      }
    />

    {/* KPIs */}
    <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <div className="kpi">
        <div className="kpi-label">
          <I.building size={12} />
          Tenants activos
        </div>
        <div className="kpi-value">
          2 <span style={{ fontSize: 13, color: 'var(--fg-faint)', fontWeight: 400 }}>/ 2</span>
        </div>
        <div className="kpi-delta" style={{ color: 'var(--fg-muted)' }}>
          Idex · Agroalves
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">
          <I.users size={12} />
          Usuarios totales
        </div>
        <div className="kpi-value">12</div>
        <div className="kpi-delta up">
          <I.arrow_up size={11} />
          +3 esta semana
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">
          <I.invoice size={12} />
          Facturas SUNAT (mes)
        </div>
        <div className="kpi-value">847</div>
        <div className="kpi-delta up">
          <I.arrow_up size={11} />
          +12,4% vs marzo
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">
          <I.bolt size={12} />
          API NUBEFACT
        </div>
        <div className="kpi-value" style={{ color: 'var(--success-fg)' }}>
          99,8%
        </div>
        <div className="kpi-delta" style={{ color: 'var(--fg-muted)' }}>
          último incidente: 21 abr
        </div>
      </div>
    </div>

    {/* Tenants overview + chart */}
    <div style={{ display: 'grid', gridTemplateColumns: '5fr 3fr', gap: 16, marginTop: 16 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Tenants</div>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
            Ver todos
            <I.arrow_r size={12} />
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Plan</th>
              <th>Usuarios</th>
              <th>Docs SUNAT (mes)</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                mark: 'IX',
                cls: 'tenant-idex',
                name: 'Idex',
                slug: '/idex',
                plan: 'Pro',
                users: 7,
                docs: 612,
                est: 'activo',
              },
              {
                mark: 'AG',
                cls: 'tenant-agro',
                name: 'Agroalves',
                slug: '/agroalves',
                plan: 'Pro',
                users: 5,
                docs: 235,
                est: 'activo',
              },
              {
                mark: 'NV',
                cls: '',
                name: 'Nuevo (demo)',
                slug: '/demo',
                plan: 'Trial',
                users: 0,
                docs: 0,
                est: 'prueba',
              },
            ].map((t, i) => (
              <tr key={i}>
                <td>
                  <div className="row">
                    <div
                      className={t.cls}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        background: t.cls ? 'var(--accent)' : 'var(--bg-muted)',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {t.mark}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{t.name}</div>
                      <div className="muted mono-text" style={{ fontSize: 11 }}>
                        {t.slug}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="tag">{t.plan}</span>
                </td>
                <td className="num">{t.users}</td>
                <td className="num">{t.docs.toLocaleString('en-US')}</td>
                <td>
                  <Badge estado={t.est} />
                </td>
                <td>
                  <I.more size={14} className="muted" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Volumen SUNAT · 30 días</div>
        </div>
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <AreaChart
            color="var(--accent)"
            height={140}
            data={[
              12, 18, 22, 17, 28, 32, 40, 35, 42, 38, 52, 48, 55, 60, 58, 72, 68, 80, 72, 85, 90,
              86, 94, 102, 98, 108, 112, 118, 122, 128,
            ]}
          />
          <div className="row" style={{ marginTop: 12, fontSize: 11, color: 'var(--fg-muted)' }}>
            <span>1 abr</span>
            <span style={{ marginLeft: 'auto' }}>29 abr</span>
          </div>
        </div>
        <div className="divider" />
        <div className="card-body" style={{ paddingTop: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              color: 'var(--fg-muted)',
              marginBottom: 8,
            }}
          >
            Distribución por tenant
          </div>
          <div className="row" style={{ gap: 12 }}>
            <Donut
              size={80}
              segments={[
                { label: 'Idex', value: 612, color: '#0070f3' },
                { label: 'Agroalves', value: 235, color: '#16a34a' },
              ]}
            />
            <div className="col" style={{ gap: 6, flex: 1 }}>
              <div className="row" style={{ fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#0070f3' }} />
                <span>Idex</span>
                <span className="muted" style={{ marginLeft: 'auto' }}>
                  612 · 72%
                </span>
              </div>
              <div className="row" style={{ fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: '#16a34a' }} />
                <span>Agroalves</span>
                <span className="muted" style={{ marginLeft: 'auto' }}>
                  235 · 28%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Recent activity */}
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <div className="card-title">Actividad reciente · auditoría</div>
        <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
          Ver log completo
          <I.arrow_r size={12} />
        </button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Tenant</th>
            <th>Actor</th>
            <th>Acción</th>
            <th>Detalles</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['09:42', 'Idex', 'Lucas Escrivá', 'rol_editado', 'Comercial → +productos.exportar'],
            ['09:18', 'Idex', 'M. Quispe', 'factura_emitida', 'F001-00000847 · USD 2.418,50'],
            [
              '08:55',
              'Agroalves',
              'Lucas Escrivá',
              'usuario_invitado',
              'a.salinas@agroalves.pe · Comercial',
            ],
            ['08:30', '—', 'Leonidas Yauri', 'plataforma_login', 'desde 200.123.45.67 · Lima'],
            ['ayer', 'Idex', 'sistema', 'sunat_cdr_recibido', '23 documentos procesados'],
          ].map((r, i) => (
            <tr key={i} className="tight-row">
              <td className="muted mono-text">{r[0]}</td>
              <td>
                {r[1] === '—' ? (
                  <span className="muted">—</span>
                ) : (
                  <span className="tag">{r[1]}</span>
                )}
              </td>
              <td>{r[2]}</td>
              <td>
                <span className="mono-text" style={{ fontSize: 11.5 }}>
                  {r[3]}
                </span>
              </td>
              <td className="muted">{r[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Screen>
);

const AdminTenants = () => (
  <Screen
    tenant="dignita"
    active="tenants"
    crumbs={['Plataforma', 'Tenants']}
    userName="Leonidas Yauri"
  >
    <PageHead
      title="Tenants"
      subtitle="Gestión de empresas en la plataforma"
      actions={
        <>
          <button className="btn">
            <I.download size={13} />
            Exportar
          </button>
          <button className="btn btn-primary">
            <I.plus size={13} />
            Nuevo tenant
          </button>
        </>
      }
    />

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
            style={{ border: 0, padding: 0, height: 30, background: 'transparent', flex: 1 }}
            placeholder="Buscar por nombre, RUC, slug…"
          />
        </div>
        <button className="btn btn-sm">
          <I.filter size={12} />
          Plan
        </button>
        <button className="btn btn-sm">
          <I.filter size={12} />
          Estado
        </button>
        <button className="btn btn-sm btn-ghost">Limpiar</button>
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        3 resultados
      </div>
    </div>
    <div className="card-table card" style={{ borderRadius: '0 0 8px 8px', borderTop: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th className="check">
              <span className="checkbox" />
            </th>
            <th>Tenant</th>
            <th>RUC</th>
            <th>Slug</th>
            <th>Plan</th>
            <th>Usuarios</th>
            <th className="num">Docs (mes)</th>
            <th>Creado</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[
            {
              mark: 'IX',
              accent: '#0070f3',
              name: 'Idex',
              razon: 'GRUPO IDEX SAC',
              ruc: '20614847370',
              slug: 'idex',
              plan: 'Pro',
              users: 7,
              docs: 612,
              created: '15 ene 2026',
              est: 'activo',
            },
            {
              mark: 'AG',
              accent: '#16a34a',
              name: 'Agroalves',
              razon: 'GRUPO IDEX SAC',
              ruc: '20614847370',
              slug: 'agroalves',
              plan: 'Pro',
              users: 5,
              docs: 235,
              created: '15 ene 2026',
              est: 'activo',
            },
            {
              mark: 'NV',
              accent: '#94a3b8',
              name: 'Demo Norte',
              razon: 'COMERCIAL DEMO SAC',
              ruc: '20598765432',
              slug: 'demo-norte',
              plan: 'Trial',
              users: 0,
              docs: 0,
              created: '27 abr 2026',
              est: 'prueba',
            },
          ].map((t, i) => (
            <tr key={i}>
              <td>
                <span className="checkbox" />
              </td>
              <td>
                <div className="row">
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: t.accent,
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {t.mark}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{t.name}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {t.razon}
                    </div>
                  </div>
                </div>
              </td>
              <td className="mono-text">{t.ruc}</td>
              <td className="mono-text muted">/{t.slug}</td>
              <td>
                <span className="tag">{t.plan}</span>
              </td>
              <td className="num">{t.users}</td>
              <td className="num">{t.docs.toLocaleString('en-US')}</td>
              <td className="muted">{t.created}</td>
              <td>
                <Badge estado={t.est} />
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
          Mostrando 1–3 de 3
        </span>
        <div style={{ marginLeft: 'auto' }} className="row">
          <button className="btn btn-sm" disabled>
            <I.chev_l size={12} />
          </button>
          <button className="btn btn-sm" disabled>
            <I.chev_r size={12} />
          </button>
        </div>
      </div>
    </div>
  </Screen>
);

const AdminNuevoTenant = () => (
  <Screen
    tenant="dignita"
    active="tenants"
    crumbs={['Plataforma', 'Tenants', 'Nuevo']}
    userName="Leonidas Yauri"
  >
    <PageHead title="Nuevo tenant" subtitle="Onboarding en 5 pasos · paso 2 de 5" />

    <Wizard steps={['Datos', 'Branding', 'Admin', 'Fiscal', 'Plan']} current={1} />

    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginTop: 16 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Branding</div>
        </div>
        <div
          className="card-body"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
        >
          <div className="field">
            <label className="label">
              Nombre comercial <span className="req">*</span>
            </label>
            <input className="input" defaultValue="Idex" />
            <div className="help">Aparece en el sidebar y en correos</div>
          </div>
          <div className="field">
            <label className="label">
              Slug URL <span className="req">*</span>
            </label>
            <div className="input-prefix">
              <span className="prefix mono-text">orion.app/</span>
              <input className="input mono-text" defaultValue="idex" />
            </div>
            <div className="help">Sólo letras minúsculas, números y guiones</div>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Color de acento</label>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {['#0070f3', '#16a34a', '#7c3aed', '#dc2626', '#ea580c', '#0891b2', '#0f172a'].map(
                (c, i) => (
                  <div
                    key={c}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: c,
                      position: 'relative',
                      boxShadow:
                        i === 0
                          ? '0 0 0 2px var(--bg), 0 0 0 4px var(--accent)'
                          : 'inset 0 0 0 1px rgba(0,0,0,.1)',
                    }}
                  >
                    {i === 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          color: '#fff',
                        }}
                      >
                        <I.check size={14} />
                      </div>
                    )}
                  </div>
                )
              )}
              <button className="btn btn-sm">Custom…</button>
            </div>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label className="label">Logotipo</label>
            <div
              style={{
                border: '1px dashed var(--border-strong)',
                borderRadius: 8,
                padding: 24,
                textAlign: 'center',
                background: 'var(--bg-subtle)',
              }}
            >
              <I.upload size={20} className="muted" />
              <div style={{ fontSize: 13, marginTop: 8 }}>
                Arrastrá un archivo · PNG, SVG (máx 1 MB)
              </div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                Recomendado 256×256 fondo transparente
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label">Modo dark</label>
            <div className="row">
              <span
                style={{
                  width: 32,
                  height: 18,
                  borderRadius: 999,
                  background: 'var(--accent)',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: '#fff',
                  }}
                />
              </span>
              <span style={{ fontSize: 12 }}>Habilitado para usuarios del tenant</span>
            </div>
          </div>
          <div className="field">
            <label className="label">Densidad por defecto</label>
            <select className="select">
              <option>Compacta · 36px row</option>
              <option>Normal · 44px row</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Vista previa</div>
        </div>
        <div className="card-body">
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div
              className="tenant-idex"
              style={{
                height: 36,
                background: 'var(--bg)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: 'var(--accent)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                IX
              </div>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Idex</span>
              <span className="muted mono-text" style={{ fontSize: 10, marginLeft: 'auto' }}>
                orion.app/idex
              </span>
            </div>
            <div style={{ display: 'flex', height: 220, background: 'var(--bg-subtle)' }}>
              <div
                className="tenant-idex"
                style={{
                  width: 80,
                  background: 'var(--bg)',
                  borderRight: '1px solid var(--border)',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ height: 22, borderRadius: 4, background: 'var(--accent-soft)' }} />
                <div style={{ height: 14, borderRadius: 4, background: 'var(--bg-muted)' }} />
                <div style={{ height: 14, borderRadius: 4, background: 'var(--bg-muted)' }} />
                <div style={{ height: 14, borderRadius: 4, background: 'var(--bg-muted)' }} />
              </div>
              <div style={{ flex: 1, padding: 12 }}>
                <div className="sk" style={{ width: 120, height: 14, marginBottom: 8 }} />
                <div className="sk" style={{ width: 200, height: 10 }} />
                <div
                  className="tenant-idex"
                  style={{
                    marginTop: 12,
                    padding: 8,
                    borderRadius: 6,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 11,
                    display: 'inline-block',
                  }}
                >
                  Nueva cotización
                </div>
              </div>
            </div>
          </div>
          <div className="alert alert-info" style={{ marginTop: 12 }}>
            <I.alert size={14} />
            <span>
              Los cambios de branding se aplican inmediatamente a todos los usuarios del tenant.
            </span>
          </div>
        </div>
      </div>
    </div>

    <div className="row" style={{ marginTop: 16 }}>
      <button className="btn">
        <I.chev_l size={12} />
        Atrás
      </button>
      <div style={{ marginLeft: 'auto' }} className="row">
        <button className="btn btn-ghost">Guardar borrador</button>
        <button className="tenant-dignita btn btn-primary">
          Continuar
          <I.chev_r size={12} />
        </button>
      </div>
    </div>
  </Screen>
);

window.AdminDashboard = AdminDashboard;
window.AdminTenants = AdminTenants;
window.AdminNuevoTenant = AdminNuevoTenant;
