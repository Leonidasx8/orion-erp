/* Screens 8-10: Clientes */

const ClientesList = () => (
  <Screen tenant="idex" active="clientes" crumbs={['Idex', 'Clientes']}>
    <PageHead
      title="Clientes"
      subtitle="94 clientes activos · 3 nuevos este mes"
      actions={
        <>
          <button className="btn">
            <I.upload size={13} />
            Importar
          </button>
          <button className="btn">
            <I.download size={13} />
            Exportar
          </button>
          <button className="btn btn-primary">
            <I.plus size={13} />
            Nuevo cliente
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
            minWidth: 320,
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
            placeholder="Buscar por razón social, RUC, nombre comercial…"
            defaultValue="electro"
          />
        </div>
        <button className="btn btn-sm">
          <I.filter size={12} />
          Tipo
          <I.chev_d size={11} />
        </button>
        <button className="btn btn-sm">
          <I.filter size={12} />
          Línea crédito
          <I.chev_d size={11} />
        </button>
        <button className="btn btn-sm">
          <I.filter size={12} />
          Comercial
          <I.chev_d size={11} />
        </button>
        <button className="btn btn-sm btn-ghost">Limpiar</button>
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        14 resultados · ordenar por <span style={{ color: 'var(--fg)' }}>último contacto ↓</span>
      </div>
    </div>

    <div className="card-table card" style={{ borderRadius: '0 0 8px 8px', borderTop: 0 }}>
      <table className="table">
        <thead>
          <tr>
            <th className="check">
              <span className="checkbox" />
            </th>
            <th>Razón social</th>
            <th>RUC / DNI</th>
            <th>Tipo</th>
            <th className="num">Línea crédito</th>
            <th className="num">Saldo CxC</th>
            <th>Comercial</th>
            <th>Último doc</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[
            {
              name: 'ELECTROANDES SA',
              doc: '20100123456',
              tipo: 'Jurídico',
              linea: 50000,
              saldo: 12480,
              com: 'M. Quispe',
              ult: 'COT · hace 2h',
            },
            {
              name: 'ELECTRO SUR EIRL',
              doc: '20512098765',
              tipo: 'Jurídico',
              linea: 15000,
              saldo: 0,
              com: 'M. Quispe',
              ult: 'F · hace 4d',
            },
            {
              name: 'ELECTROMECÁNICA INDUSTRIAL SAC',
              doc: '20489765432',
              tipo: 'Jurídico',
              linea: 25000,
              saldo: 8200,
              com: 'A. Salinas',
              ult: 'COT · hace 1d',
            },
            {
              name: 'ELECTROBLINDADO PERÚ SA',
              doc: '20602938475',
              tipo: 'Jurídico',
              linea: 0,
              saldo: 0,
              com: '—',
              ult: '—',
            },
            {
              name: 'TECNOLOGÍA INDUSTRIAL SAC',
              doc: '20598123456',
              tipo: 'Jurídico',
              linea: 30000,
              saldo: 4218,
              com: 'A. Salinas',
              ult: 'COT · hace 3h',
            },
            {
              name: 'GRUPO MINERA CERRO VERDE',
              doc: '20198765432',
              tipo: 'Jurídico',
              linea: 200000,
              saldo: 22150,
              com: 'L. Escrivá',
              ult: 'F · ayer',
            },
            {
              name: 'CONSTRUCTORA SUR EIRL',
              doc: '20712345678',
              tipo: 'Jurídico',
              linea: 10000,
              saldo: 1840,
              com: 'M. Quispe',
              ult: 'COT · hace 1h',
            },
            {
              name: 'TÉCNICA Y SERVICIOS DEL SUR EIRL',
              doc: '20623456789',
              tipo: 'Jurídico',
              linea: 8000,
              saldo: 0,
              com: 'M. Quispe',
              ult: 'F · hace 12d',
            },
            {
              name: 'INVERSIONES MARTÍNEZ',
              doc: '45678912',
              tipo: 'Natural',
              linea: 0,
              saldo: 0,
              com: 'A. Salinas',
              ult: 'B · hace 5d',
            },
          ].map((r, i) => (
            <tr key={i}>
              <td>
                <span className="checkbox" />
              </td>
              <td>
                <span style={{ fontWeight: 500 }}>{r.name}</span>
              </td>
              <td className="mono-text">{r.doc}</td>
              <td>
                <span className="tag">{r.tipo}</span>
              </td>
              <td className="num">
                <Money value={r.linea} dp={0} />
              </td>
              <td className="num">
                {r.saldo > 0 ? (
                  <span style={{ color: 'var(--warn-fg)' }}>
                    <Money value={r.saldo} dp={2} />
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td className="muted">{r.com}</td>
              <td className="muted" style={{ fontSize: 11.5 }}>
                {r.ult}
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
          1–9 de 14
        </span>
        <div style={{ marginLeft: 'auto' }} className="row">
          <button className="btn btn-sm" disabled>
            <I.chev_l size={12} />
          </button>
          <button className="btn btn-sm">1</button>
          <button className="btn btn-sm btn-ghost">2</button>
          <button className="btn btn-sm">
            <I.chev_r size={12} />
          </button>
        </div>
      </div>
    </div>
  </Screen>
);

/* ClienteNuevo: 4 RUC states (idle / consultando / autocompletado / error) */
const ClienteNuevo = ({ state = 'autocompletado' }) => (
  <Screen tenant="idex" active="clientes" crumbs={['Idex', 'Clientes', 'Nuevo']}>
    <PageHead
      title="Nuevo cliente"
      subtitle={
        state === 'idle'
          ? 'Ingresá el RUC o DNI; los datos se autocompletan desde apis.net.pe'
          : state === 'consultando'
            ? 'Consultando SUNAT…'
            : state === 'autocompletado'
              ? 'Datos verificados con SUNAT · cache 30 días'
              : 'apis.net.pe no responde · ingreso manual'
      }
      actions={
        <>
          <button className="btn">Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={state === 'consultando' || state === 'idle'}
          >
            Guardar cliente
          </button>
        </>
      }
    />

    <div className="card">
      <div className="card-head">
        <div className="card-title">Identificación SUNAT</div>
      </div>
      <div
        className="card-body"
        style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr', gap: 16 }}
      >
        <div className="field">
          <label className="label">
            Tipo de documento <span className="req">*</span>
          </label>
          <select className="select">
            <option>RUC</option>
            <option>DNI</option>
            <option>CE</option>
            <option>Pasaporte</option>
          </select>
        </div>
        <div className="field">
          <label className="label">
            Número <span className="req">*</span>
          </label>
          <div className="input-prefix">
            <input
              className="input mono-text"
              defaultValue="20100123456"
              style={{
                borderColor:
                  state === 'error'
                    ? 'var(--danger)'
                    : state === 'autocompletado'
                      ? 'var(--success)'
                      : 'var(--border)',
                boxShadow:
                  state === 'autocompletado'
                    ? '0 0 0 3px var(--success-soft)'
                    : state === 'error'
                      ? '0 0 0 3px var(--danger-soft)'
                      : 'none',
              }}
            />
            <button className="btn" style={{ marginLeft: 8 }} disabled={state === 'consultando'}>
              {state === 'consultando' ? (
                <>
                  <I.refresh size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  Consultando…
                </>
              ) : (
                <>
                  <I.search size={13} />
                  Validar
                </>
              )}
            </button>
          </div>
          {state === 'autocompletado' && (
            <div className="help" style={{ color: 'var(--success-fg)' }}>
              <I.check size={11} style={{ verticalAlign: 'middle' }} /> Validado con SUNAT · padrón
              al 28 abr 2026
            </div>
          )}
          {state === 'error' && (
            <div className="help" style={{ color: 'var(--danger-fg)' }}>
              <I.x size={11} style={{ verticalAlign: 'middle' }} /> No encontrado en padrón
            </div>
          )}
        </div>
        <div className="field">
          <label className="label">Estado SUNAT</label>
          {state === 'consultando' ? (
            <Sk w="100%" h={34} />
          ) : state === 'autocompletado' ? (
            <span className="badge badge-aprobada" style={{ height: 28, alignSelf: 'flex-start' }}>
              <span className="dot" />
              ACTIVO · HABIDO
            </span>
          ) : state === 'error' ? (
            <span className="badge badge-vencida" style={{ height: 28, alignSelf: 'flex-start' }}>
              <span className="dot" />
              API NO DISPONIBLE
            </span>
          ) : (
            <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>
              —
            </span>
          )}
        </div>
      </div>

      {state === 'error' && (
        <div className="card-body" style={{ paddingTop: 0 }}>
          <div className="alert alert-warn">
            <I.warn size={14} />
            <div>
              <div style={{ fontWeight: 500 }}>apis.net.pe no responde</div>
              <div style={{ fontSize: 11.5, marginTop: 2 }}>
                Podés ingresar los datos manualmente. El cliente quedará marcado como "no validado"
                y se intentará validar en background cada 6 horas.
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="card-body"
        style={{ paddingTop: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
      >
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label className="label">
            Razón social {state === 'idle' ? '' : <span className="req">*</span>}
          </label>
          {state === 'consultando' ? (
            <Sk w="100%" h={34} />
          ) : (
            <input
              className="input"
              defaultValue={state === 'idle' ? '' : 'ELECTROANDES SA'}
              placeholder={state === 'idle' ? 'Se autocompletará con SUNAT' : ''}
              style={{
                background: state === 'autocompletado' ? 'var(--success-soft)' : 'var(--bg)',
                borderColor: state === 'autocompletado' ? 'var(--success)' : 'var(--border)',
              }}
            />
          )}
        </div>
        <div className="field">
          <label className="label">Nombre comercial</label>
          {state === 'consultando' ? (
            <Sk w="100%" h={34} />
          ) : (
            <input className="input" defaultValue={state === 'idle' ? '' : 'Electroandes'} />
          )}
        </div>
        <div className="field">
          <label className="label">Tipo de cliente</label>
          <select className="select">
            <option>Persona jurídica</option>
            <option>Persona natural</option>
          </select>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label className="label">Dirección fiscal</label>
          {state === 'consultando' ? (
            <Sk w="100%" h={34} />
          ) : (
            <input
              className="input"
              defaultValue={
                state === 'idle' ? '' : 'AV. ARGENTINA NRO. 2750 - LIMA - LIMA - CALLAO'
              }
            />
          )}
        </div>
      </div>
    </div>

    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <div className="card-title">Contacto y comerciales</div>
      </div>
      <div
        className="card-body"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}
      >
        <div className="field">
          <label className="label">Email principal</label>
          <input className="input" placeholder="contacto@empresa.pe" />
        </div>
        <div className="field">
          <label className="label">Teléfono</label>
          <input className="input" placeholder="+51 ..." />
        </div>
        <div className="field">
          <label className="label">Comercial asignado</label>
          <select className="select">
            <option>Sin asignar</option>
            <option>M. Quispe</option>
            <option>A. Salinas</option>
            <option>L. Escrivá</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Línea de crédito (USD)</label>
          <input className="input mono-text" defaultValue="0" type="number" />
          <div className="help">0 = sólo contado</div>
        </div>
        <div className="field">
          <label className="label">Plazo de pago</label>
          <select className="select">
            <option>Contado</option>
            <option>15 días</option>
            <option>30 días</option>
            <option>60 días</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Lista de precios</label>
          <select className="select">
            <option>Lista AAA (default)</option>
            <option>Distribuidor</option>
            <option>Mayorista</option>
          </select>
        </div>
      </div>
    </div>
  </Screen>
);

const ClienteDetalle = () => (
  <Screen tenant="idex" active="clientes" crumbs={['Idex', 'Clientes', 'ELECTROANDES SA']}>
    <div className="row" style={{ marginBottom: 16 }}>
      <div>
        <div className="row" style={{ gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            ELECTROANDES SA
          </h1>
          <Badge estado="activo" />
          <span className="tag">Persona jurídica</span>
        </div>
        <div
          className="row"
          style={{ marginTop: 6, gap: 16, fontSize: 12, color: 'var(--fg-muted)' }}
        >
          <div className="row" style={{ gap: 4 }}>
            <I.hash size={12} />
            <span className="mono-text">RUC 20100123456</span>
          </div>
          <div className="row" style={{ gap: 4 }}>
            <I.mail size={12} />
            contacto@electroandes.pe
          </div>
          <div className="row" style={{ gap: 4 }}>
            <I.user size={12} />
            Comercial: M. Quispe
          </div>
          <div className="row" style={{ gap: 4, color: 'var(--success-fg)' }}>
            <I.check size={12} />
            SUNAT activo · habido
          </div>
        </div>
      </div>
      <div style={{ marginLeft: 'auto' }} className="row">
        <button className="btn">
          <I.edit size={13} />
          Editar
        </button>
        <button className="btn btn-primary">
          <I.plus size={13} />
          Nueva cotización
        </button>
      </div>
    </div>

    {/* Summary cards */}
    <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
      <div className="kpi">
        <div className="kpi-label">Línea de crédito</div>
        <div className="kpi-value">
          <Money value={50000} dp={0} />
        </div>
        <div className="kpi-delta muted">Plazo 30 días</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Saldo actual</div>
        <div className="kpi-value" style={{ color: 'var(--warn-fg)' }}>
          <Money value={12480} dp={2} />
        </div>
        <div className="kpi-delta down">25% utilizado</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Ventas YTD</div>
        <div className="kpi-value">
          <Money value={84212} dp={2} />
        </div>
        <div className="kpi-delta up">
          <I.arrow_up size={11} />
          +22% vs 2025
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Doc por vencer</div>
        <div className="kpi-value">2</div>
        <div className="kpi-delta" style={{ color: 'var(--warn-fg)' }}>
          <I.warn size={11} />
          USD 4.218 en 5 días
        </div>
      </div>
    </div>

    <Tabs items={['General', 'Cotizaciones (12)', 'Facturas (28)', 'Crédito y pagos']} active={0} />

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Datos fiscales</div>
        </div>
        <div className="card-body col" style={{ gap: 10, fontSize: 12.5 }}>
          {[
            ['Razón social', 'ELECTROANDES SA'],
            ['Nombre comercial', 'Electroandes'],
            ['RUC', '20100123456'],
            ['Estado SUNAT', 'ACTIVO · HABIDO'],
            ['Dirección fiscal', 'AV. ARGENTINA 2750, CALLAO'],
            ['Tipo de operación', 'Gravada con IGV'],
          ].map(([k, v]) => (
            <div key={k} className="row" style={{ alignItems: 'flex-start' }}>
              <span className="muted" style={{ width: 130, flex: 'none' }}>
                {k}
              </span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Contactos</div>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
            <I.plus size={11} />
          </button>
        </div>
        <div className="card-body col" style={{ gap: 10 }}>
          {[
            {
              name: 'Juan Pérez Vargas',
              role: 'Compras',
              mail: 'jperez@electroandes.pe',
              primary: true,
            },
            { name: 'María García', role: 'Tesorería', mail: 'mgarcia@electroandes.pe' },
            { name: 'Carlos Núñez', role: 'Almacén', mail: 'cnunez@electroandes.pe' },
          ].map((c, i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <Avatar name={c.name} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 500, fontSize: 12.5 }}>{c.name}</span>
                  {c.primary && (
                    <span
                      className="tag"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent-fg)' }}
                    >
                      principal
                    </span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  {c.role} · {c.mail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Actividad reciente</div>
        </div>
        <div className="card-body">
          <div className="timeline">
            {[
              { dot: 'done', t: 'Factura emitida', m: 'F001-00000847 · USD 2.418 · hace 2h' },
              { dot: 'done', t: 'Cotización aprobada', m: 'COT-2026-00132 · hace 1 día' },
              { dot: 'done', t: 'Pago recibido', m: 'F001-00000821 · USD 4.200 · hace 4 días' },
              {
                dot: 'done',
                t: 'Cliente actualizado',
                m: 'línea de crédito 30k → 50k · hace 12 días',
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
      </div>
    </div>
  </Screen>
);

window.ClientesList = ClientesList;
window.ClienteNuevo = ClienteNuevo;
window.ClienteDetalle = ClienteDetalle;
