/* Screens 23-26: Crédito + Admin tenant (Usuarios, Roles) */

const CreditoCxC = () => (
  <Screen tenant="idex" active="credito" crumbs={['Idex', 'Crédito y CxC']}>
    <PageHead
      title="Crédito y cuentas por cobrar"
      subtitle="USD 87.420 por cobrar · USD 12.480 vencido · 14 clientes con saldo"
      actions={
        <>
          <button className="btn">
            <I.download size={13} />
            Reporte aging
          </button>
          <button className="btn btn-primary">
            <I.send size={13} />
            Recordatorios masivos
          </button>
        </>
      }
    />

    {/* Aging buckets */}
    <div className="card" style={{ marginBottom: 16, padding: 16 }}>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="card-title">Aging report · 29 abr 2026</div>
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 11.5 }}>
          14 clientes · USD 87.420,30
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {[
          { l: 'Por vencer', v: 54820, n: 8, color: 'var(--success)' },
          { l: '1-30 días', v: 20120, n: 3, color: 'var(--accent)' },
          { l: '31-60 días', v: 7820, n: 2, color: 'var(--warn)' },
          { l: '61-90 días', v: 3770, n: 1, color: '#ea580c' },
          { l: '+90 días', v: 890, n: 1, color: 'var(--danger)' },
        ].map((b, i) => (
          <div key={i} style={{ borderRadius: 6, padding: 12, background: 'var(--bg-subtle)' }}>
            <div className="row" style={{ gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: b.color }} />
              <span className="muted" style={{ fontSize: 11.5 }}>
                {b.l}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, marginTop: 6 }}>
              $ {b.v.toLocaleString('en-US')}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {b.n} {b.n === 1 ? 'cliente' : 'clientes'}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          background: 'var(--bg-subtle)',
        }}
      >
        {[
          [54820, 'var(--success)'],
          [20120, 'var(--accent)'],
          [7820, 'var(--warn)'],
          [3770, '#ea580c'],
          [890, 'var(--danger)'],
        ].map(([v, c], i) => (
          <div key={i} style={{ width: `${(v / 87420) * 100}%`, background: c }} />
        ))}
      </div>
    </div>

    <div className="card-table card">
      <div className="card-head">
        <div className="card-title">Saldos por cliente</div>
        <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
          <button
            className="btn btn-sm"
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent-fg)',
              borderColor: 'transparent',
            }}
          >
            Con saldo
          </button>
          <button className="btn btn-sm btn-ghost">Vencidos</button>
          <button className="btn btn-sm btn-ghost">Sobre línea</button>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th className="num">Línea</th>
            <th className="num">Utilizado</th>
            <th>Uso</th>
            <th className="num">Por vencer</th>
            <th className="num">Vencido</th>
            <th>Días vencido</th>
            <th className="num">Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[
            {
              c: 'GRUPO MINERA CERRO VERDE',
              l: 50000,
              u: 22150.5,
              pv: 22150.5,
              v: 0,
              d: 0,
              est: 'good',
            },
            {
              c: 'ELECTROMECÁNICA INDUSTRIAL',
              l: 25000,
              u: 12480.0,
              pv: 0,
              v: 12480.0,
              d: 5,
              est: 'warn',
            },
            {
              c: 'TECNOLOGÍA INDUSTRIAL SAC',
              l: 15000,
              u: 4218.4,
              pv: 4218.4,
              v: 0,
              d: 0,
              est: 'good',
            },
            {
              c: 'CONSTRUCTORA SUR EIRL',
              l: 10000,
              u: 6420.3,
              pv: 6420.3,
              v: 0,
              d: 0,
              est: 'good',
            },
            {
              c: 'ELECTROANDES SA',
              l: 30000,
              u: 8842.1,
              pv: 1840.2,
              v: 7001.9,
              d: 38,
              est: 'danger',
            },
            { c: 'INVERSIONES MARTÍNEZ', l: 5000, u: 890.0, pv: 0, v: 890.0, d: 97, est: 'danger' },
            {
              c: 'TÉCNICA Y SERVICIOS SUR',
              l: 8000,
              u: 3210.0,
              pv: 0,
              v: 3210.0,
              d: 62,
              est: 'danger',
            },
          ].map((r, i) => {
            const pct = Math.round((r.u / r.l) * 100);
            const ringColor =
              pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warn)' : 'var(--success)';
            return (
              <tr key={i}>
                <td
                  style={{
                    maxWidth: 220,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.c}
                </td>
                <td className="num">
                  <Money value={r.l} dp={0} />
                </td>
                <td className="num">
                  <Money value={r.u} dp={2} />
                </td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div
                      style={{
                        width: 60,
                        height: 6,
                        borderRadius: 3,
                        background: 'var(--bg-muted)',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ width: `${pct}%`, height: '100%', background: ringColor }} />
                    </div>
                    <span className="num" style={{ fontSize: 11 }}>
                      {pct}%
                    </span>
                  </div>
                </td>
                <td className="num">
                  <Money value={r.pv} dp={2} />
                </td>
                <td
                  className="num"
                  style={{ color: r.v > 0 ? 'var(--danger-fg)' : 'var(--fg-muted)' }}
                >
                  {r.v > 0 ? <Money value={r.v} dp={2} /> : '—'}
                </td>
                <td>
                  {r.d === 0 ? (
                    <span className="muted">—</span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11.5,
                        color: r.d > 60 ? 'var(--danger-fg)' : 'var(--warn-fg)',
                      }}
                    >
                      {r.d} días
                    </span>
                  )}
                </td>
                <td className="num">
                  <strong>
                    <Money value={r.pv + r.v} dp={2} />
                  </strong>
                </td>
                <td>
                  {r.est === 'danger' ? (
                    <button
                      className="btn btn-sm"
                      style={{ color: 'var(--danger-fg)', borderColor: 'var(--danger-soft)' }}
                    >
                      <I.send size={11} />
                      Cobrar
                    </button>
                  ) : (
                    <I.more size={14} className="muted" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Screen>
);

const UsuariosTenant = () => (
  <Screen tenant="idex" active="usuarios" crumbs={['Idex', 'Administración', 'Usuarios']}>
    <PageHead
      title="Usuarios de Idex"
      subtitle="8 activos · 1 invitación pendiente · MFA obligatorio para roles privilegiados"
      actions={
        <>
          <button className="btn">
            <I.download size={13} />
            Exportar
          </button>
          <button className="btn btn-primary">
            <I.user_plus size={13} />
            Invitar usuario
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
            style={{
              border: 0,
              padding: 0,
              height: 30,
              background: 'transparent',
              flex: 1,
              minWidth: 0,
            }}
            placeholder="Buscar por nombre, email…"
          />
        </div>
        <button className="btn btn-sm">
          <I.lock size={12} />
          Rol
          <I.chev_d size={11} />
        </button>
        <button className="btn btn-sm">
          Estado
          <I.chev_d size={11} />
        </button>
      </div>
    </div>

    <div className="card-table card" style={{ borderRadius: '0 0 8px 8px', borderTop: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>MFA</th>
            <th>Último acceso</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[
            {
              n: 'Lucas Escrivá',
              e: 'lucas@idex.pe',
              ini: 'LE',
              rol: 'Superadmin',
              mfa: true,
              ult: 'hace 12 min',
              est: 'activo',
              privileged: true,
            },
            {
              n: 'Marta Quispe',
              e: 'marta@idex.pe',
              ini: 'MQ',
              rol: 'Comercial',
              mfa: true,
              ult: 'hace 2 horas',
              est: 'activo',
            },
            {
              n: 'Andrés Salinas',
              e: 'andres@idex.pe',
              ini: 'AS',
              rol: 'Bodega',
              mfa: false,
              ult: 'ayer 18:42',
              est: 'activo',
            },
            {
              n: 'Patricia Morales',
              e: 'patricia@idex.pe',
              ini: 'PM',
              rol: 'Contabilidad',
              mfa: true,
              ult: 'hace 4 horas',
              est: 'activo',
              privileged: true,
            },
            {
              n: 'Roberto Fernández',
              e: 'roberto@idex.pe',
              ini: 'RF',
              rol: 'Comercial',
              mfa: true,
              ult: 'hace 1 día',
              est: 'activo',
            },
            {
              n: 'Diana Castro',
              e: 'diana@idex.pe',
              ini: 'DC',
              rol: 'Comercial',
              mfa: true,
              ult: 'hace 6 días',
              est: 'activo',
            },
            {
              n: 'Hugo Pereira',
              e: 'hugo@idex.pe',
              ini: 'HP',
              rol: 'Bodega',
              mfa: false,
              ult: 'hace 32 días',
              est: 'inactivo',
            },
            {
              n: 'Carmen Vidal',
              e: 'carmen@idex.pe',
              ini: 'CV',
              rol: 'Solo lectura',
              mfa: false,
              ult: 'hace 4 meses',
              est: 'suspendido',
            },
            {
              n: '(invitación pendiente)',
              e: 'pedro.aliaga@idex.pe',
              ini: 'PA',
              rol: 'Comercial',
              mfa: null,
              ult: '—',
              est: 'invitado',
            },
          ].map((u, i) => (
            <tr key={i}>
              <td>
                <div className="row">
                  <Avatar size={28} initials={u.ini} />
                  <div style={{ marginLeft: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{u.n}</div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {u.e}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <span
                  className="tag"
                  style={
                    u.privileged
                      ? { background: 'var(--accent-soft)', color: 'var(--accent-fg)' }
                      : {}
                  }
                >
                  {u.privileged && <I.shield size={11} />}
                  {u.rol}
                </span>
              </td>
              <td>
                {u.mfa === true ? (
                  <span style={{ color: 'var(--success-fg)', fontSize: 11.5 }}>
                    <I.check size={12} style={{ verticalAlign: 'middle' }} /> Activo
                  </span>
                ) : u.mfa === false ? (
                  <span style={{ color: 'var(--warn-fg)', fontSize: 11.5 }}>
                    <I.warn size={12} style={{ verticalAlign: 'middle' }} /> Inactivo
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td className="muted">{u.ult}</td>
              <td>
                <Badge estado={u.est} />
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
          9 usuarios totales
        </span>
        <div style={{ marginLeft: 'auto' }} className="row" style={{ gap: 12, fontSize: 11.5 }}>
          <span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'var(--success)',
                display: 'inline-block',
                marginRight: 6,
              }}
            />
            6 activos
          </span>
          <span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'var(--warn)',
                display: 'inline-block',
                marginRight: 6,
              }}
            />
            1 invitado
          </span>
          <span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: 'var(--bg-muted)',
                display: 'inline-block',
                marginRight: 6,
              }}
            />
            2 inactivos/suspendidos
          </span>
        </div>
      </div>
    </div>
  </Screen>
);

const RolesPermisos = () => (
  <Screen tenant="idex" active="roles" crumbs={['Idex', 'Administración', 'Roles y permisos']}>
    <PageHead
      title="Rol: Comercial"
      subtitle="3 usuarios · basado en plantilla 'Comercial' · personalizado"
      actions={
        <>
          <button className="btn">
            <I.copy size={13} />
            Duplicar rol
          </button>
          <button className="btn btn-primary">
            <I.check size={13} />
            Guardar cambios
          </button>
        </>
      }
    />

    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
      {/* Roles list */}
      <div className="card" style={{ height: 'fit-content' }}>
        <div className="card-head" style={{ padding: '10px 12px' }}>
          <div className="card-title" style={{ fontSize: 11.5 }}>
            Roles del tenant
          </div>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', padding: '0 6px' }}>
            <I.plus size={11} />
          </button>
        </div>
        <div className="col">
          {[
            { n: 'Superadmin', u: 1, sys: true },
            { n: 'Comercial', u: 3, active: true },
            { n: 'Bodega', u: 2 },
            { n: 'Contabilidad', u: 1 },
            { n: 'Solo lectura', u: 1, sys: true },
            { n: 'Cobranzas (custom)', u: 0 },
          ].map((r, i) => (
            <div
              key={i}
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--border-subtle)',
                background: r.active ? 'var(--accent-soft)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div className="row">
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: r.active ? 600 : 500,
                    color: r.active ? 'var(--accent-fg)' : 'var(--fg)',
                  }}
                >
                  {r.n}
                </span>
                {r.sys && <I.lock size={10} className="muted" style={{ marginLeft: 4 }} />}
                <span className="muted" style={{ fontSize: 11, marginLeft: 'auto' }}>
                  {r.u}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Permission matrix */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Permisos · 32 acciones · 12 módulos</div>
          <div className="row" style={{ marginLeft: 'auto', gap: 6 }}>
            <button className="btn btn-sm btn-ghost">Ver solo cambios vs. plantilla</button>
            <button className="btn btn-sm">Bulk: aplicar plantilla</button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 200 }}>Módulo · acción</th>
              <th style={{ textAlign: 'center', width: 80 }}>Ver</th>
              <th style={{ textAlign: 'center', width: 80 }}>Crear</th>
              <th style={{ textAlign: 'center', width: 80 }}>Editar</th>
              <th style={{ textAlign: 'center', width: 80 }}>Eliminar</th>
              <th>Notas</th>
            </tr>
          </thead>
          <tbody>
            {[
              { m: 'Clientes', v: 1, c: 1, e: 1, d: 0 },
              {
                m: 'Clientes · ver datos sensibles',
                v: 0,
                c: 0,
                e: 0,
                d: 0,
                sens: true,
                n: 'Solo Superadmin / Contabilidad',
              },
              { m: 'Productos', v: 1, c: 0, e: 0, d: 0 },
              {
                m: 'Productos · precios',
                v: 1,
                c: 0,
                e: 1,
                d: 0,
                custom: true,
                n: 'Modificado: editar habilitado para esta venta',
              },
              { m: 'Cotizaciones', v: 1, c: 1, e: 1, d: 1 },
              {
                m: 'Cotizaciones · aprobar > $5k',
                v: 0,
                c: 0,
                e: 0,
                d: 0,
                sens: true,
                n: 'Requiere rol Superadmin',
              },
              { m: 'Órdenes de pedido', v: 1, c: 1, e: 1, d: 0 },
              { m: 'Inventario · kardex', v: 1, c: 0, e: 0, d: 0 },
              { m: 'Inventario · ajustes', v: 0, c: 0, e: 0, d: 0, sens: true },
              { m: 'Guías de remisión', v: 1, c: 1, e: 0, d: 0 },
              { m: 'Facturas · emitir', v: 1, c: 1, e: 0, d: 0 },
              {
                m: 'Facturas · anular',
                v: 0,
                c: 0,
                e: 0,
                d: 0,
                sens: true,
                n: 'Acción crítica · requiere segunda autorización',
              },
              {
                m: 'Crédito · aumentar línea',
                v: 1,
                c: 0,
                e: 0,
                d: 0,
                n: 'Solo lectura del módulo',
              },
              { m: 'Reportes', v: 1, c: 0, e: 0, d: 0 },
              { m: 'Auditoría', v: 0, c: 0, e: 0, d: 0, sens: true },
              { m: 'Usuarios y roles', v: 0, c: 0, e: 0, d: 0, sens: true },
            ].map((p, i) => {
              const Cell = ({ on }) => (
                <td style={{ textAlign: 'center' }}>
                  <span className={`switch ${on ? 'on' : ''}`} style={{ display: 'inline-flex' }}>
                    <span className="switch-knob" />
                  </span>
                </td>
              );
              return (
                <tr
                  key={i}
                  style={{
                    background: p.sens
                      ? 'rgba(220,38,38,.025)'
                      : p.custom
                        ? 'rgba(245,158,11,.04)'
                        : undefined,
                  }}
                >
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      {p.sens && <I.shield size={11} style={{ color: 'var(--danger-fg)' }} />}
                      {p.custom && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 999,
                            background: 'var(--warn)',
                          }}
                          title="Modificado"
                        />
                      )}
                      <span style={{ fontSize: 12.5, fontWeight: p.custom ? 500 : 400 }}>
                        {p.m}
                      </span>
                    </div>
                  </td>
                  <Cell on={p.v} />
                  <Cell on={p.c} />
                  <Cell on={p.e} />
                  <Cell on={p.d} />
                  <td
                    className="muted"
                    style={{
                      fontSize: 11,
                      maxWidth: 280,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.n || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="card-foot">
          <div className="row" style={{ gap: 16, fontSize: 11.5 }}>
            <span>
              <I.shield size={11} style={{ color: 'var(--danger-fg)', verticalAlign: 'middle' }} />{' '}
              Permiso sensible
            </span>
            <span>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: 'var(--warn)',
                  display: 'inline-block',
                  marginRight: 4,
                }}
              />
              Modificado vs. plantilla
            </span>
          </div>
          <span className="muted" style={{ marginLeft: 'auto', fontSize: 11.5 }}>
            1 cambio sin guardar
          </span>
        </div>
      </div>
    </div>

    <div className="alert alert-warn" style={{ marginTop: 16 }}>
      <I.warn size={14} />
      <div>
        <div style={{ fontWeight: 500 }}>Estás modificando un rol con 3 usuarios activos</div>
        <div style={{ fontSize: 11.5, marginTop: 2 }}>
          Los cambios se aplicarán inmediatamente a Marta Quispe, Roberto Fernández y Diana Castro.
          Su próximo refresh de sesión usará los nuevos permisos.
        </div>
      </div>
    </div>
  </Screen>
);

const ConfiguracionTenant = () => (
  <Screen tenant="idex" active="config" crumbs={['Idex', 'Configuración']}>
    <PageHead
      title="Configuración de Idex"
      subtitle="Datos de la empresa, facturación electrónica, política de precios"
    />

    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
      <div className="card" style={{ height: 'fit-content' }}>
        <div className="col">
          {[
            ['General', true, <I.cog size={13} />],
            ['Datos fiscales', false, <I.shield size={13} />],
            ['Facturación SUNAT', false, <I.cloud size={13} />],
            ['Series y numeración', false, <I.invoice size={13} />],
            ['Política de precios', false, <I.chart size={13} />],
            ['Almacenes', false, <I.layers size={13} />],
            ['Tipo de cambio', false, <I.refresh size={13} />],
            ['Notificaciones', false, <I.bell size={13} />],
            ['Integraciones', false, <I.plug size={13} />],
          ].map(([n, active, icon], i) => (
            <div
              key={i}
              className="row"
              style={{
                padding: '10px 12px',
                gap: 8,
                background: active ? 'var(--accent-soft)' : 'transparent',
                color: active ? 'var(--accent-fg)' : 'var(--fg)',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: active ? 600 : 400,
              }}
            >
              {icon}
              <span>{n}</span>
              <I.chev_r size={11} className="muted" style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </div>

      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Identidad de la empresa</div>
          </div>
          <div
            className="card-body"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="label">Logotipo</label>
              <div className="row" style={{ gap: 12 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 8,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 18,
                    fontWeight: 700,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  IX
                </div>
                <div className="col" style={{ gap: 6 }}>
                  <button className="btn btn-sm">
                    <I.upload size={12} />
                    Subir logo
                  </button>
                  <span className="muted" style={{ fontSize: 11 }}>
                    PNG/SVG · mínimo 256×256 · usado en PDFs y header
                  </span>
                </div>
              </div>
            </div>
            <div className="field">
              <label className="label">
                Razón social <span className="req">*</span>
              </label>
              <input className="input" defaultValue="IDEX SAC" />
            </div>
            <div className="field">
              <label className="label">Nombre comercial</label>
              <input className="input" defaultValue="Idex" />
            </div>
            <div className="field">
              <label className="label">Industria</label>
              <select className="select">
                <option>Conectores eléctricos</option>
                <option>Materiales eléctricos</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Tamaño</label>
              <select className="select">
                <option>10–50 empleados</option>
                <option>50–200</option>
                <option>200+</option>
              </select>
            </div>
            <div className="field">
              <label className="label">Slug del subdominio</label>
              <div className="input-prefix">
                <input
                  className="input mono-text"
                  defaultValue="idex"
                  style={{ borderRadius: '6px 0 0 6px' }}
                />
                <span
                  style={{
                    padding: '0 10px',
                    height: 32,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderLeft: 0,
                    borderRadius: '0 6px 6px 0',
                    fontSize: 12,
                    color: 'var(--fg-muted)',
                  }}
                >
                  .dignita.pe
                </span>
              </div>
            </div>
            <div className="field">
              <label className="label">Zona horaria</label>
              <select className="select">
                <option>America/Lima (PET, UTC−5)</option>
              </select>
            </div>
          </div>
          <div className="card-foot">
            <button className="btn btn-ghost">Cancelar</button>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }}>
              Guardar cambios
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Política de precios y márgenes</div>
            <span className="tag" style={{ marginLeft: 8 }}>
              <I.shield size={11} />
              Solo Superadmin
            </span>
          </div>
          <div className="card-body col" style={{ gap: 14 }}>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Margen mínimo global</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  Bloquea emitir cotizaciones por debajo de este margen sin aprobación de
                  Superadmin.
                </div>
              </div>
              <input
                className="input mono-text"
                defaultValue="10%"
                style={{ width: 100, textAlign: 'right' }}
              />
            </div>
            <div className="divider" />
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Aprobación obligatoria sobre</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  Cotizaciones por encima de este monto requieren aprobación antes de ser enviadas.
                </div>
              </div>
              <input
                className="input mono-text"
                defaultValue="USD 5,000"
                style={{ width: 140, textAlign: 'right' }}
              />
            </div>
            <div className="divider" />
            <div className="row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Aplicar IGV automático</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  18% IGV se calcula sobre todas las líneas gravadas
                </div>
              </div>
              <span className="switch on">
                <span className="switch-knob" />
              </span>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Permitir descuentos por línea</div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  Comercial puede aplicar descuento hasta 5% sin aprobación
                </div>
              </div>
              <span className="switch on">
                <span className="switch-knob" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Screen>
);

window.CreditoCxC = CreditoCxC;
window.UsuariosTenant = UsuariosTenant;
window.RolesPermisos = RolesPermisos;
window.ConfiguracionTenant = ConfiguracionTenant;
