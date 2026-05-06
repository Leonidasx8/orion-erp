/* Orion ERP — shared primitives + icons (single Lucide-style stroke set) */
const { useState } = React;

/* === Icons (24x24, stroke 1.75) === */
const Ico = ({ d, size = 16, sw = 1.75, fill, style, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill || 'none'}
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    {...rest}
  >
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const I = {
  search: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </>
      }
    />
  ),
  plus: (p) => <Ico {...p} d="M12 5v14M5 12h14" />,
  check: (p) => <Ico {...p} d="M5 12.5 10 17 19 7" />,
  x: (p) => <Ico {...p} d="M6 6l12 12M18 6 6 18" />,
  chev_d: (p) => <Ico {...p} d="M6 9l6 6 6-6" />,
  chev_r: (p) => <Ico {...p} d="M9 6l6 6-6 6" />,
  chev_l: (p) => <Ico {...p} d="M15 6l-6 6 6 6" />,
  chev_u: (p) => <Ico {...p} d="M6 15l6-6 6 6" />,
  more: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </>
      }
    />
  ),
  filter: (p) => <Ico {...p} d="M4 5h16l-6 8v6l-4-2v-4z" />,
  download: (p) => <Ico {...p} d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" />,
  upload: (p) => <Ico {...p} d="M12 20V8m0 0-4 4m4-4 4 4M4 4h16" />,
  edit: (p) => <Ico {...p} d="M4 20h4l11-11-4-4L4 16zM14 6l4 4" />,
  trash: (p) => (
    <Ico
      {...p}
      d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
    />
  ),
  copy: (p) => <Ico {...p} d="M8 4h10v14H8zM6 8H4v12h12v-2" />,
  send: (p) => <Ico {...p} d="m4 12 16-8-6 18-3-7-7-3z" />,
  user: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
        </>
      }
    />
  ),
  users: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 21c.7-3 3-5 6-5s5.3 2 6 5" />
          <path d="M16 4a3.5 3.5 0 0 1 0 7" />
          <path d="M21 21c-.5-2-2-3.5-4-4" />
        </>
      }
    />
  ),
  building: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="4" y="3" width="16" height="18" rx="1" />
          <path d="M9 8h2M9 12h2M9 16h2M14 8h1M14 12h1M14 16h1" />
        </>
      }
    />
  ),
  package: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="m4 7 8-4 8 4-8 4-8-4z" />
          <path d="M4 7v10l8 4 8-4V7" />
          <path d="M12 11v10" />
        </>
      }
    />
  ),
  doc: (p) => <Ico {...p} d="M6 3h9l4 4v14H6zM15 3v4h4" />,
  doc_text: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M6 3h9l4 4v14H6zM15 3v4h4" />
          <path d="M9 12h7M9 16h5" />
        </>
      }
    />
  ),
  invoice: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M5 3h14v18l-2-2-2 2-2-2-2 2-2-2-2 2-2-2z" />
          <path d="M9 9h7M9 13h7M9 17h4" />
        </>
      }
    />
  ),
  receipt: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M5 3h14v18l-2-2-2 2-2-2-2 2-2-2-2 2-2-2z" />
          <path d="M9 8h6M9 12h6M9 16h6" />
        </>
      }
    />
  ),
  truck: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="2" y="7" width="11" height="9" rx="1" />
          <path d="M13 10h4l3 3v3h-7z" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="17" cy="18" r="2" />
        </>
      }
    />
  ),
  wallet: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M16 14h2" />
        </>
      }
    />
  ),
  chart: (p) => <Ico {...p} d="M4 19V5M4 19h16M8 16V11M12 16V8M16 16v-7" />,
  pie: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M12 4v8h8a8 8 0 1 1-8-8z" />
          <path d="M14 2a8 8 0 0 1 8 8h-8z" />
        </>
      }
    />
  ),
  home: (p) => <Ico {...p} d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-7H10v7H5a1 1 0 0 1-1-1z" />,
  cog: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 14.5 21 13l-1.6-1.5.4-2.1-2.1-.4L16 7l-1.5 1.6L13 7l-1.5 1.6L10 7 8.5 8.6 7 7 5.5 8.6 4 9l.4 2.1L3 13l1.6 1.5-.4 2.1 2.1.4L8 17l1.5-1.6L11 17l1.5-1.6L14 17l1.5-1.6L17 17l1.5-1.6 2.1-.4z" />
        </>
      }
    />
  ),
  bell: (p) => <Ico {...p} d="M6 19h12l-2-2v-5a4 4 0 0 0-8 0v5l-2 2zM10 19a2 2 0 0 0 4 0" />,
  question: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
        </>
      }
    />
  ),
  warn: (p) => <Ico {...p} d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
  shield: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M12 3 4 6v6c0 5 3 8 8 9 5-1 8-4 8-9V6z" />
          <path d="m9 12 2 2 4-4" />
        </>
      }
    />
  ),
  lock: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      }
    />
  ),
  mail: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 7 9-7" />
        </>
      }
    />
  ),
  arrow_r: (p) => <Ico {...p} d="M5 12h14M13 6l6 6-6 6" />,
  arrow_l: (p) => <Ico {...p} d="M19 12H5M11 6l-6 6 6 6" />,
  arrow_ud: (p) => <Ico {...p} d="M8 6v12m0 0-3-3m3 3 3-3M16 18V6m0 0-3 3m3-3 3 3" />,
  ext: (p) => <Ico {...p} d="M10 5H5v14h14v-5M14 4h6v6M9 15 20 4" />,
  drag: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="9" cy="6" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="18" r="1" />
          <circle cx="15" cy="6" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="18" r="1" />
        </>
      }
    />
  ),
  alert: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </>
      }
    />
  ),
  sliders: (p) => (
    <Ico {...p} d="M4 6h10M16 6h4M4 12h4M10 12h10M4 18h12M18 18h2M14 4v4M8 10v4M16 16v4" />
  ),
  flame: (p) => (
    <Ico
      {...p}
      d="M12 22c4 0 7-3 7-7 0-3-2-5-3-6 0 2-1 3-2 3 0-3-1-6-3-8-1 3-3 4-3 7 0 1-1 2-1 4 0 4 1 7 5 7z"
    />
  ),
  dot: (p) => <Ico {...p} fill="currentColor" d={<circle cx="12" cy="12" r="3" />} />,
  refresh: (p) => (
    <Ico {...p} d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5" />
  ),
  link: (p) => (
    <Ico
      {...p}
      d="M10 14a4 4 0 0 0 5 1l3-3a4 4 0 1 0-6-6l-1 1M14 10a4 4 0 0 0-5-1l-3 3a4 4 0 1 0 6 6l1-1"
    />
  ),
  eye: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      }
    />
  ),
  eye_off: (p) => (
    <Ico
      {...p}
      d="M3 3l18 18M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.7M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.9-.7M9.9 9.9a3 3 0 0 0 4.2 4.2"
    />
  ),
  calendar: (p) => (
    <Ico
      {...p}
      d={
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </>
      }
    />
  ),
  clock: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      }
    />
  ),
  layers: (p) => <Ico {...p} d="M12 3 2 8l10 5 10-5zM2 13l10 5 10-5M2 18l10 5 10-5" />,
  excel: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M6 3h9l4 4v14H6zM15 3v4h4" />
          <path d="m9 11 5 7M14 11l-5 7" />
        </>
      }
    />
  ),
  pdf: (p) => (
    <Ico
      {...p}
      d="M6 3h9l4 4v14H6zM15 3v4h4M9 13h1.5a1.5 1.5 0 0 1 0 3H9zM9 13v6M14 13v6M14 13h2M14 16h1.5M19 13h-1v6"
    />
  ),
  bolt: (p) => <Ico {...p} d="M13 3 4 14h6l-1 7 9-11h-6z" />,
  sparkle: (p) => (
    <Ico
      {...p}
      d="M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5zM19 4l.7 2 2 .7-2 .7L19 9l-.7-2-2-.7 2-.7zM5 16l.7 2 2 .7-2 .7L5 21l-.7-2-2-.7 2-.7z"
    />
  ),
  star: (p) => <Ico {...p} d="m12 3 2.7 6 6.3.5-4.8 4 1.5 6-5.7-3.4L6.3 19.5l1.5-6L3 9.5 9.3 9z" />,
  globe: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </>
      }
    />
  ),
  branch: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="6" cy="5" r="2" />
          <circle cx="6" cy="19" r="2" />
          <circle cx="18" cy="12" r="2" />
          <path d="M6 7v10M6 12c0-3 4-5 8-5" />
        </>
      }
    />
  ),
  zap: (p) => <Ico {...p} d="M13 3 4 14h6l-1 7 9-11h-6z" />,
  history: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M3 12a9 9 0 1 1 3 6.7" />
          <path d="M3 21v-5h5" />
          <path d="M12 7v5l3 2" />
        </>
      }
    />
  ),
  inbox: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M22 12h-6l-2 3h-4l-2-3H2" />
          <path d="M5 5h14l3 7v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-7z" />
        </>
      }
    />
  ),
  tag: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M3 12V4h8l10 10-8 8z" />
          <circle cx="8" cy="8" r="1.5" />
        </>
      }
    />
  ),
  external: (p) => (
    <Ico {...p} d="M14 4h6v6M10 14 20 4M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  ),
  spark: (p) => <Ico {...p} d="M3 17l5-5 4 4 8-9" />,
  arrow_up: (p) => <Ico {...p} d="M7 14l5-5 5 5" />,
  arrow_dn: (p) => <Ico {...p} d="M7 10l5 5 5-5" />,
  arrow_dr: (p) => <Ico {...p} d="M7 7l10 10M17 17V9M17 17H9" />,
  hash: (p) => <Ico {...p} d="M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16" />,
  adjust: (p) => (
    <Ico {...p} d="M4 6h10M16 6h4M4 12h4M10 12h10M4 18h12M18 18h2M14 4v4M8 10v4M16 16v4" />
  ),
  cloud: (p) => <Ico {...p} d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6 1.4A4 4 0 0 1 17 18z" />,
  code: (p) => <Ico {...p} d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" />,
  print: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M6 9V4h12v5" />
          <path d="M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2" />
          <path d="M6 14h12v6H6z" />
        </>
      }
    />
  ),
  user_plus: (p) => (
    <Ico
      {...p}
      d={
        <>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <path d="M18 9v6M15 12h6" />
        </>
      }
    />
  ),
  plug: (p) => <Ico {...p} d="M7 4v6M17 4v6M5 10h14v3a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5zM12 18v3" />,
  refresh: (p) => (
    <Ico
      {...p}
      d={
        <>
          <path d="M3 12a9 9 0 0 1 15.6-6.2L21 8M21 4v4h-4" />
          <path d="M21 12a9 9 0 0 1-15.6 6.2L3 16M3 20v-4h4" />
        </>
      }
    />
  ),
};
window.I = I;

/* === Status badges === */
const ESTADOS = {
  borrador: { cls: 'badge-borrador', label: 'Borrador' },
  enviada: { cls: 'badge-enviada', label: 'Enviada' },
  pendiente: { cls: 'badge-enviada', label: 'Pendiente' },
  aprobada: { cls: 'badge-aprobada', label: 'Aprobada' },
  aceptada: { cls: 'badge-aprobada', label: 'Aceptada SUNAT' },
  pagada: { cls: 'badge-aprobada', label: 'Pagada' },
  rechazada: { cls: 'badge-rechazada', label: 'Rechazada' },
  error: { cls: 'badge-rechazada', label: 'Error' },
  vencida: { cls: 'badge-vencida', label: 'Vencida' },
  anulada: { cls: 'badge-anulada', label: 'Anulada' },
  convertida: { cls: 'badge-converted', label: 'Convertida' },
  activo: { cls: 'badge-aprobada', label: 'Activo' },
  suspendido: { cls: 'badge-vencida', label: 'Suspendido' },
  prueba: { cls: 'badge-enviada', label: 'Prueba' },
};

const Badge = ({ estado, label, className }) => {
  const cfg = ESTADOS[estado] || { cls: 'badge-outline', label: label || estado };
  return (
    <span className={`badge ${cfg.cls} ${className || ''}`}>
      <span className="dot" />
      {label || cfg.label}
    </span>
  );
};

/* === Money display === */
const Money = ({ value, ccy = 'USD', dp = 2 }) => {
  const v = Number(value).toLocaleString('en-US', {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
  return (
    <span className="money">
      <span className="ccy">{ccy}</span>
      {v}
    </span>
  );
};

/* === Avatar === */
const Avatar = ({ name = '', size }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
  return <div className={`avatar ${size === 'lg' ? 'lg' : ''}`}>{initials || '?'}</div>;
};

/* === Sidebar === */
const Sidebar = ({ tenant, brandName, brandMeta, brandMark, sections, footerUser }) => (
  <aside className="sidebar">
    <div className="sidebar-brand">
      <div className="brand-mark">{brandMark}</div>
      <div style={{ minWidth: 0 }}>
        <div className="brand-name">{brandName}</div>
        <div className="brand-meta">{brandMeta}</div>
      </div>
    </div>
    <div style={{ overflow: 'auto', flex: 1 }}>
      {sections.map((sec, i) => (
        <div className="nav-section" key={i}>
          {sec.label && <div className="nav-label">{sec.label}</div>}
          {sec.items.map((it, j) => {
            const Ic = I[it.icon] || I.dot;
            return (
              <div className={`nav-item ${it.active ? 'active' : ''}`} key={j}>
                <Ic size={16} className="nav-ico" />
                <span>{it.label}</span>
                {it.badge != null && <span className="nav-badge">{it.badge}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
    {footerUser && (
      <div className="sidebar-footer">
        <Avatar name={footerUser.name} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: 'var(--fg)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {footerUser.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-faint)' }}>{footerUser.role}</div>
        </div>
        <I.cog size={14} style={{ marginLeft: 'auto', color: 'var(--fg-faint)' }} />
      </div>
    )}
  </aside>
);

/* === Header === */
const Header = ({ crumbs = [], userName = 'L. Escrivá' }) => (
  <header className="header">
    <div className="crumbs">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <I.chev_r size={14} className="sep" />}
          <span className={i === crumbs.length - 1 ? 'current' : ''}>{c}</span>
        </React.Fragment>
      ))}
    </div>
    <div className="header-search">
      <I.search size={14} />
      <span>Buscar productos, clientes, cotizaciones…</span>
      <span className="kbd">⌘K</span>
    </div>
    <div className="icon-btn">
      <I.bell size={16} />
    </div>
    <div className="icon-btn">
      <I.question size={16} />
    </div>
    <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
    <div className="row" style={{ gap: 8 }}>
      <Avatar name={userName} />
      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{userName}</span>
      <I.chev_d size={14} className="muted" />
    </div>
  </header>
);

/* === Wizard steps === */
const Wizard = ({ steps, current = 0 }) => (
  <div className="wizard">
    {steps.map((s, i) => (
      <div
        className={`w-step ${i < current ? 'done' : ''} ${i === current ? 'active' : ''}`}
        key={i}
      >
        <div className="w-num">{i < current ? <I.check size={12} /> : i + 1}</div>
        <div className="w-text">{s}</div>
      </div>
    ))}
  </div>
);

/* === Tabs === */
const Tabs = ({ items, active = 0 }) => (
  <div className="tabs">
    {items.map((t, i) => (
      <div className={`tab ${i === active ? 'active' : ''}`} key={i}>
        {t}
      </div>
    ))}
  </div>
);

/* === Page head === */
const PageHead = ({ title, subtitle, actions }) => (
  <div className="page-head">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle && <div className="page-subtitle">{subtitle}</div>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </div>
);

/* === Empty state === */
const Empty = ({ icon = 'inbox', title, body, cta }) => {
  const Ic = I[icon] || I.inbox;
  return (
    <div className="empty">
      <div className="empty-icon">
        <Ic size={20} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {cta}
    </div>
  );
};

/* === Skeleton row === */
const Sk = ({ w = 80, h = 12, style }) => (
  <span className="sk" style={{ width: w, height: h, ...style }} />
);

/* === Mini chart placeholders (SVG) === */
const AreaChart = ({ data, color = 'var(--accent)', height = 120 }) => {
  // data: array of nums 0..1
  const w = 100,
    h = 100;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h * 0.9 - 5}`);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
    >
      <defs>
        <linearGradient id="ag" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill="url(#ag)" />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const BarChart = ({ data, labels, color = 'var(--accent)', height = 160 }) => {
  const max = Math.max(...data) * 1.15;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        height,
        padding: '8px 4px 24px',
        position: 'relative',
      }}
    >
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            height: '100%',
            justifyContent: 'flex-end',
          }}
        >
          <div
            style={{
              width: '70%',
              height: `${(v / max) * 100}%`,
              background: color,
              borderRadius: '3px 3px 0 0',
              opacity: 0.9,
            }}
          />
          <div
            style={{ position: 'absolute', bottom: 0, fontSize: 10.5, color: 'var(--fg-muted)' }}
          >
            {labels[i]}
          </div>
        </div>
      ))}
    </div>
  );
};

const Donut = ({ segments, size = 120 }) => {
  // segments: [{ label, value, color }]
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const r = 40,
    c = 50;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg-muted)" strokeWidth="14" />
      {segments.map((s, i) => {
        const len = (s.value / total) * circ;
        const off = -((acc / total) * circ);
        acc += s.value;
        return (
          <circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={off}
            transform="rotate(-90 50 50)"
          />
        );
      })}
    </svg>
  );
};

/* placeholder image */
const Placeholder = ({ label = 'imagen', w = '100%', h = 120 }) => (
  <div
    style={{
      width: w,
      height: h,
      background:
        'repeating-linear-gradient(45deg, var(--bg-muted), var(--bg-muted) 6px, var(--bg-subtle) 6px, var(--bg-subtle) 12px)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      display: 'grid',
      placeItems: 'center',
      color: 'var(--fg-faint)',
      fontFamily: 'var(--ff-mono)',
      fontSize: 10,
    }}
  >
    {label}
  </div>
);

Object.assign(window, {
  Ico,
  I,
  Badge,
  Money,
  Avatar,
  Sidebar,
  Header,
  Wizard,
  Tabs,
  PageHead,
  Empty,
  Sk,
  AreaChart,
  BarChart,
  Donut,
  Placeholder,
  ESTADOS,
});
