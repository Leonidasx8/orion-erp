/* Screens 11-13: Productos */

const ProductosList = () => (
  <Screen tenant="idex" active="productos" crumbs={['Idex', 'Productos']}>
    <PageHead
      title="Catálogo"
      subtitle="475 productos · 14 familias · lista AAA vigente"
      actions={
        <>
          <button className="btn">
            <I.upload size={13} />
            Importar Excel
          </button>
          <button className="btn">
            <I.download size={13} />
            Exportar
          </button>
          <button className="btn btn-primary">
            <I.plus size={13} />
            Nuevo producto
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
            minWidth: 360,
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
            placeholder="Buscar SKU, descripción, calibre…"
            defaultValue="terminal 50"
          />
          <span className="kbd" style={{ marginLeft: 4 }}>
            fuzzy
          </span>
        </div>
        <button
          className="btn btn-sm"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-fg)',
            borderColor: 'var(--accent-soft)',
          }}
        >
          Familia: Terminales 1 hueco
          <I.x size={11} />
        </button>
        <button className="btn btn-sm">
          <I.filter size={12} />
          Calibre
          <I.chev_d size={11} />
        </button>
        <button className="btn btn-sm">
          <I.filter size={12} />
          Stock
          <I.chev_d size={11} />
        </button>
      </div>
      <div className="row" style={{ gap: 4 }}>
        <button className="icon-btn" style={{ background: 'var(--bg-muted)' }}>
          <I.layers size={14} />
        </button>
        <button className="icon-btn">
          <I.sliders size={14} />
        </button>
      </div>
    </div>

    {/* Grid of product cards */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        padding: '12px 0',
        background: 'var(--bg)',
        borderLeft: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {[
        {
          sku: 'TER-50AWG-1/4',
          desc: 'Terminal compresión 1 hueco 50 AWG agujero ¼"',
          cal: '50mm²',
          volt: '600V',
          stock: 3,
          min: 20,
          precio: 0.1536,
        },
        {
          sku: 'TER-25AWG-3/8',
          desc: 'Terminal compresión 1 hueco 25 AWG agujero ⅜"',
          cal: '25mm²',
          volt: '600V',
          stock: 0,
          min: 15,
          precio: 0.0987,
        },
        {
          sku: 'TER-70AWG-1/2',
          desc: 'Terminal compresión 1 hueco 70 AWG agujero ½"',
          cal: '70mm²',
          volt: '600V',
          stock: 42,
          min: 20,
          precio: 0.2148,
        },
        {
          sku: 'TER-95AWG-1/2',
          desc: 'Terminal compresión 1 hueco 95 AWG agujero ½"',
          cal: '95mm²',
          volt: '600V',
          stock: 18,
          min: 15,
          precio: 0.289,
        },
        {
          sku: 'TER-120AWG-5/8',
          desc: 'Terminal compresión 1 hueco 120 AWG agujero ⅝"',
          cal: '120mm²',
          volt: '600V',
          stock: 24,
          min: 10,
          precio: 0.3712,
        },
        {
          sku: 'TER-150AWG-5/8',
          desc: 'Terminal compresión 1 hueco 150 AWG agujero ⅝"',
          cal: '150mm²',
          volt: '600V',
          stock: 12,
          min: 10,
          precio: 0.4528,
        },
        {
          sku: 'TER-185AWG-3/4',
          desc: 'Terminal compresión 1 hueco 185 AWG agujero ¾"',
          cal: '185mm²',
          volt: '600V',
          stock: 8,
          min: 8,
          precio: 0.586,
        },
        {
          sku: 'TER-240AWG-3/4',
          desc: 'Terminal compresión 1 hueco 240 AWG agujero ¾"',
          cal: '240mm²',
          volt: '600V',
          stock: 5,
          min: 5,
          precio: 0.7245,
        },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--bg)',
            cursor: 'pointer',
          }}
        >
          <Placeholder label={p.sku} h={100} />
          <div style={{ padding: 12 }}>
            <div className="mono-text" style={{ fontSize: 11, color: 'var(--accent-fg)' }}>
              {p.sku}
            </div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                marginTop: 2,
                lineHeight: 1.3,
                height: 32,
                overflow: 'hidden',
              }}
            >
              {p.desc}
            </div>
            <div className="row" style={{ gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              <span className="tag">{p.cal}</span>
              <span className="tag">{p.volt}</span>
            </div>
            <div className="row" style={{ marginTop: 10, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 600 }}>
                <Money value={p.precio} dp={4} />
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 11.5,
                  color:
                    p.stock === 0
                      ? 'var(--danger-fg)'
                      : p.stock < p.min
                        ? 'var(--warn-fg)'
                        : 'var(--fg-muted)',
                }}
              >
                {p.stock === 0 ? (
                  'Sin stock'
                ) : p.stock < p.min ? (
                  <span>
                    <I.warn size={11} style={{ verticalAlign: 'middle' }} /> {p.stock} de {p.min}
                  </span>
                ) : (
                  `${p.stock} u.`
                )}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div
      className="card-foot"
      style={{ borderRadius: '0 0 8px 8px', borderTop: 0, border: '1px solid var(--border)' }}
    >
      <span className="muted" style={{ fontSize: 12 }}>
        1–8 de 47 con "terminal 50"
      </span>
      <div style={{ marginLeft: 'auto' }} className="row">
        <button className="btn btn-sm">
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
  </Screen>
);

const ProductoDetalle = () => (
  <Screen tenant="idex" active="productos" crumbs={['Idex', 'Productos', 'TER-50AWG-1/4']}>
    <div className="row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 80, height: 80, borderRadius: 8, marginRight: 16, flex: 'none' }}>
        <Placeholder label="img" h={80} />
      </div>
      <div>
        <div className="mono-text" style={{ fontSize: 12, color: 'var(--accent-fg)' }}>
          TER-50AWG-1/4
        </div>
        <h1 className="page-title" style={{ margin: '4px 0' }}>
          Terminal compresión 1 hueco 50 AWG agujero ¼"
        </h1>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <Badge estado="activo" />
          <span className="tag">Familia: Terminales 1 hueco 35Kv</span>
          <span className="tag">50mm²</span>
          <span className="tag">600V</span>
          <span className="tag" style={{ color: 'var(--warn-fg)', background: 'var(--warn-soft)' }}>
            <I.warn size={11} />
            Stock 3 de 20
          </span>
        </div>
      </div>
      <div style={{ marginLeft: 'auto' }} className="row">
        <button className="btn">
          <I.copy size={13} />
          Duplicar
        </button>
        <button className="btn">
          <I.edit size={13} />
          Editar
        </button>
      </div>
    </div>

    <Tabs items={['Datos generales', 'Precios e historial', 'Kardex', 'Ventas']} active={1} />

    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Precios vigentes</div>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}>
            <I.plus size={12} />
            Nuevo precio
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Moneda</th>
              <th className="num">Precio</th>
              <th>Vigente desde</th>
              <th>Hasta</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="tag perm-sens">
                  <I.shield size={11} />
                  Compra
                </span>
              </td>
              <td>USD</td>
              <td className="num">
                <Money value={0.1342} dp={4} />
              </td>
              <td className="muted">01 ene 2026</td>
              <td className="muted">—</td>
              <td>
                <I.more size={14} className="muted" />
              </td>
            </tr>
            <tr>
              <td>
                <span className="tag">Venta sugerido</span>
              </td>
              <td>USD</td>
              <td className="num">
                <Money value={0.1536} dp={4} />
              </td>
              <td className="muted">01 ene 2026</td>
              <td className="muted">—</td>
              <td>
                <I.more size={14} className="muted" />
              </td>
            </tr>
            <tr>
              <td>
                <span className="tag">Mayorista</span>
              </td>
              <td>USD</td>
              <td className="num">
                <Money value={0.145} dp={4} />
              </td>
              <td className="muted">15 mar 2026</td>
              <td className="muted">—</td>
              <td>
                <I.more size={14} className="muted" />
              </td>
            </tr>
          </tbody>
        </table>
        <div className="card-foot" style={{ borderRadius: '0 0 8px 8px' }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Margen actual: <strong style={{ color: 'var(--success-fg)' }}>14,4%</strong> · margen
            mínimo configurado: 10%
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Histórico de precio venta · 12 meses</div>
        </div>
        <div className="card-body">
          <AreaChart
            color="var(--accent)"
            height={140}
            data={[
              0.142, 0.142, 0.145, 0.148, 0.148, 0.15, 0.15, 0.151, 0.152, 0.152, 0.153, 0.1536,
            ]}
          />
          <div className="row" style={{ marginTop: 8, fontSize: 11, color: 'var(--fg-muted)' }}>
            <span>May 2025</span>
            <span style={{ marginLeft: 'auto' }}>Abr 2026</span>
          </div>
        </div>
        <div className="divider" />
        <div className="card-body" style={{ paddingTop: 12 }}>
          <div className="row" style={{ fontSize: 12 }}>
            <span className="muted">Variación 12m</span>
            <span style={{ marginLeft: 'auto', color: 'var(--success-fg)', fontWeight: 600 }}>
              <I.arrow_up size={11} /> +8,2%
            </span>
          </div>
          <div className="row" style={{ fontSize: 12, marginTop: 6 }}>
            <span className="muted">Último cambio</span>
            <span style={{ marginLeft: 'auto' }}>15 mar 2026 · L. Escrivá</span>
          </div>
        </div>
      </div>
    </div>

    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <div className="card-title">Atributos</div>
      </div>
      <div
        className="card-body"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}
      >
        {[
          ['Familia', 'Terminales 1 hueco 35Kv'],
          ['Calibre', '50mm² · 1/0 AWG'],
          ['Diámetro agujero', '1/4 pulgada'],
          ['Voltaje', '600V'],
          ['Color', 'Estaño'],
          ['Unidad medida', 'NIU (unidad)'],
          ['Margen mínimo', '10%'],
          ['Proveedor', 'SegElectrica'],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="muted" style={{ fontSize: 11 }}>
              {k}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  </Screen>
);

const ProductosImportar = () => (
  <Screen tenant="idex" active="productos" crumbs={['Idex', 'Productos', 'Importar']}>
    <PageHead title="Importar productos" subtitle="Paso 2 de 3 · revisión y corrección" />

    <Wizard steps={['Subir archivo', 'Vista previa', 'Confirmar']} current={1} />

    <div className="row" style={{ marginTop: 16, marginBottom: 12, gap: 16 }}>
      <div className="row" style={{ gap: 8 }}>
        <I.excel size={18} className="muted" />
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>catalogo-segelectrica-abr26.xlsx</div>
          <div className="muted" style={{ fontSize: 11.5 }}>
            475 filas · headers detectados en fila 10 · hoja "Lista AAA"
          </div>
        </div>
      </div>
      <div style={{ marginLeft: 'auto' }} className="row" style={{ gap: 16 }}>
        <div className="row" style={{ gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--success)' }} />
          <span style={{ fontSize: 12 }}>463 OK</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--warn)' }} />
          <span style={{ fontSize: 12 }}>9 advertencias</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--danger)' }} />
          <span style={{ fontSize: 12 }}>3 errores</span>
        </div>
      </div>
    </div>

    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>SKU</th>
            <th>Descripción</th>
            <th>Familia</th>
            <th>Calibre</th>
            <th className="num">P. compra</th>
            <th className="num">P. venta</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {[
            {
              f: 11,
              sku: 'TER-50AWG-1/4',
              d: 'Terminal compresión 1 hueco 50 AWG agujero ¼"',
              fam: 'Terminales 1 hueco',
              cal: '50mm²',
              pc: 0.1342,
              pv: 0.1536,
              est: 'ok',
            },
            {
              f: 12,
              sku: 'TER-25AWG-3/8',
              d: 'Terminal compresión 1 hueco 25 AWG agujero ⅜"',
              fam: 'Terminales 1 hueco',
              cal: '25mm²',
              pc: 0.0876,
              pv: 0.0987,
              est: 'ok',
            },
            {
              f: 13,
              sku: 'TER-70AWG-1/2',
              d: 'Terminal compresión 1 hueco 70 AWG agujero ½"',
              fam: 'Terminales 1 hueco',
              cal: '70mm²',
              pc: 0.1875,
              pv: 0.2148,
              est: 'ok',
            },
            {
              f: 14,
              sku: 'CAB-10AWG-NEG',
              d: 'Cable cobre 10 AWG color negro 600V',
              fam: '',
              cal: '10 AWG',
              pc: 1.24,
              pv: 1.42,
              est: 'warn',
              msg: 'Familia vacía · se asignará "Sin clasificar"',
            },
            {
              f: 15,
              sku: '',
              d: 'Terminal universal 35mm² agujero ⅜"',
              fam: 'Terminales 1 hueco',
              cal: '35mm²',
              pc: 0.1102,
              pv: 0.128,
              est: 'err',
              msg: 'SKU obligatorio',
            },
            {
              f: 16,
              sku: 'TER-50AWG-1/4',
              d: 'Terminal compresión 50AWG (duplicado)',
              fam: 'Terminales 1 hueco',
              cal: '50mm²',
              pc: 0.1342,
              pv: 0.1536,
              est: 'err',
              msg: 'SKU duplicado en fila 11',
            },
            {
              f: 17,
              sku: 'TUB-12-NEG',
              d: 'Tubería termo-contractible 12mm',
              fam: 'Aislantes',
              cal: '12mm',
              pc: 0.42,
              pv: 0.48,
              est: 'ok',
            },
            {
              f: 18,
              sku: 'CAB-14AWG-AZU',
              d: 'Cable cobre 14 AWG azul 600V',
              fam: 'Cables',
              cal: '14 AWG',
              pc: 0.685,
              pv: 0.79,
              est: 'warn',
              msg: 'Margen 15,3% > recomendado, verificar',
            },
            {
              f: 19,
              sku: 'TER-95AWG-1/2',
              d: 'Terminal compresión 95 AWG ½"',
              fam: 'Terminales 1 hueco',
              cal: '95mm²',
              pc: 0,
              pv: 0.289,
              est: 'err',
              msg: 'Precio compra = 0',
            },
          ].map((r, i) => (
            <tr
              key={i}
              style={{
                background:
                  r.est === 'err'
                    ? 'rgba(220,38,38,.04)'
                    : r.est === 'warn'
                      ? 'rgba(234,88,12,.04)'
                      : undefined,
              }}
            >
              <td className="muted mono-text">{r.f}</td>
              <td className="mono-text" style={{ color: r.sku ? 'var(--fg)' : 'var(--danger-fg)' }}>
                {r.sku || '— vacío —'}
              </td>
              <td
                style={{
                  maxWidth: 280,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r.d}
              </td>
              <td className={r.fam ? '' : 'muted'} style={{ fontSize: 11.5 }}>
                {r.fam || '—'}
              </td>
              <td className="mono-text" style={{ fontSize: 11.5 }}>
                {r.cal}
              </td>
              <td className="num">
                <Money value={r.pc} dp={4} />
              </td>
              <td className="num">
                <Money value={r.pv} dp={4} />
              </td>
              <td>
                {r.est === 'ok' && (
                  <span style={{ color: 'var(--success-fg)', fontSize: 11.5 }}>
                    <I.check size={12} style={{ verticalAlign: 'middle' }} /> OK
                  </span>
                )}
                {r.est === 'warn' && (
                  <span style={{ color: 'var(--warn-fg)', fontSize: 11.5 }}>
                    <I.warn size={12} style={{ verticalAlign: 'middle' }} /> {r.msg}
                  </span>
                )}
                {r.est === 'err' && (
                  <span style={{ color: 'var(--danger-fg)', fontSize: 11.5 }}>
                    <I.x size={12} style={{ verticalAlign: 'middle' }} /> {r.msg}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card-foot">
        <span className="muted" style={{ fontSize: 12 }}>
          Filas 11–19 de 484 · 9 con problemas
        </span>
        <div style={{ marginLeft: 'auto' }} className="row">
          <button className="btn btn-sm">Solo errores</button>
          <button className="btn btn-sm btn-ghost">Mostrar todas</button>
        </div>
      </div>
    </div>

    <div className="alert alert-danger" style={{ marginTop: 16 }}>
      <I.x size={14} />
      <div>
        <div style={{ fontWeight: 500 }}>3 errores impiden la importación</div>
        <div style={{ fontSize: 11.5, marginTop: 2 }}>
          Corregí los errores en el archivo y volvé a subirlo, o editá las filas inline antes de
          continuar.
        </div>
      </div>
    </div>

    <div className="row" style={{ marginTop: 16 }}>
      <button className="btn">
        <I.chev_l size={12} />
        Subir otro archivo
      </button>
      <div style={{ marginLeft: 'auto' }} className="row">
        <button className="btn btn-ghost">Descargar reporte de errores</button>
        <button className="btn btn-primary" disabled>
          Confirmar import (475)
          <I.chev_r size={12} />
        </button>
      </div>
    </div>
  </Screen>
);

window.ProductosList = ProductosList;
window.ProductoDetalle = ProductoDetalle;
window.ProductosImportar = ProductosImportar;
