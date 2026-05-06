/* Screens 4-6: Auth */

const Login = () => (
  <div className="screen auth tenant-dignita">
    <div className="auth-shell">
      <div style={{ width: 400 }}>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 24, gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
            }}
          >
            O
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.01em' }}>
            Sistema Orión
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-.01em' }}>
            Ingresar
          </h1>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 20px' }}>
            Te enviamos un enlace mágico al correo. No usamos contraseñas.
          </p>

          <div className="field">
            <label className="label">Correo corporativo</label>
            <div className="input-prefix">
              <span className="prefix">
                <I.mail size={13} />
              </span>
              <input className="input" defaultValue="lucas@idex.pe" />
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
          >
            Enviar enlace mágico
            <I.arrow_r size={14} />
          </button>

          <div className="divider" style={{ margin: '20px 0' }} />
          <div
            className="row"
            style={{ fontSize: 12, color: 'var(--fg-muted)', justifyContent: 'center', gap: 6 }}
          >
            <I.shield size={13} />
            <span>Conexión segura · MFA requerido para Superadmin</span>
          </div>
        </div>

        <div className="muted" style={{ fontSize: 11.5, textAlign: 'center', marginTop: 16 }}>
          ¿Problemas para ingresar? Contactá a{' '}
          <span style={{ color: 'var(--accent-fg)' }}>soporte@dignita.tech</span>
        </div>
      </div>
    </div>
  </div>
);

const LoginMfa = () => (
  <div className="screen auth tenant-idex">
    <div className="auth-shell">
      <div style={{ width: 400 }}>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 24, gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
            }}
          >
            O
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.01em' }}>
            Sistema Orión
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
              marginBottom: 12,
            }}
          >
            <I.shield size={20} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-.01em' }}>
            Verificación en dos pasos
          </h1>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0 20px' }}>
            Ingresá el código de 6 dígitos generado por tu app autenticadora (Google Authenticator,
            1Password).
          </p>

          <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
            {['4', '7', '2', '9', '—', '—'].map((d, i) => (
              <div
                key={i}
                style={{
                  width: 48,
                  height: 56,
                  borderRadius: 8,
                  border: '1px solid ' + (i < 4 ? 'var(--accent)' : 'var(--border)'),
                  background: i < 4 ? 'var(--bg)' : 'var(--bg-subtle)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 22,
                  fontWeight: 600,
                  color: i < 4 ? 'var(--fg)' : 'var(--fg-faint)',
                  fontFamily: 'var(--ff-mono)',
                  boxShadow: i === 4 ? '0 0 0 3px var(--accent-soft)' : 'none',
                  borderColor:
                    i === 4 ? 'var(--accent)' : i < 4 ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
            disabled
          >
            Verificar
          </button>

          <div
            className="row"
            style={{ marginTop: 16, fontSize: 12, justifyContent: 'space-between' }}
          >
            <span className="muted">Código expira en 0:23</span>
            <a style={{ color: 'var(--accent-fg)' }}>Usar código de respaldo</a>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'center', marginTop: 16, fontSize: 12 }}>
          <a className="muted" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <I.chev_l size={12} />
            Volver al ingreso
          </a>
        </div>
      </div>
    </div>
  </div>
);

const SeleccionarEmpresa = () => (
  <div className="screen auth tenant-dignita">
    <div className="auth-shell">
      <div style={{ width: 720 }}>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 32, gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
            }}
          >
            O
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-.01em' }}>
            Sistema Orión
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: '-.02em' }}>
            Hola, Lucas 👋
          </h1>
          <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
            Tenés acceso a 2 empresas. ¿Con cuál querés trabajar hoy?
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            {
              tcls: 'tenant-idex',
              mark: 'IX',
              name: 'Idex',
              razon: 'GRUPO IDEX SAC',
              role: 'Superadmin',
              users: 7,
              last: 'hace 2 horas',
              active: true,
            },
            {
              tcls: 'tenant-agro',
              mark: 'AG',
              name: 'Agroalves',
              razon: 'GRUPO IDEX SAC',
              role: 'Superadmin',
              users: 5,
              last: 'hace 3 días',
              active: false,
            },
          ].map((t, i) => (
            <div
              key={i}
              className={`card ${t.tcls}`}
              style={{
                padding: 20,
                cursor: 'pointer',
                borderColor: t.active ? 'var(--accent)' : 'var(--border)',
                boxShadow: t.active ? '0 0 0 3px var(--accent-soft)' : 'var(--sh-1)',
              }}
            >
              <div className="row">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: 'var(--accent)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {t.mark}
                </div>
                <div style={{ marginLeft: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {t.razon}
                  </div>
                </div>
                {t.active && (
                  <I.check size={18} style={{ marginLeft: 'auto', color: 'var(--accent)' }} />
                )}
              </div>
              <div className="row" style={{ marginTop: 16, gap: 16, fontSize: 12 }}>
                <div className="row" style={{ gap: 4 }}>
                  <I.shield size={12} className="muted" />
                  <span>{t.role}</span>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <I.users size={12} className="muted" />
                  <span>{t.users} usuarios</span>
                </div>
                <div
                  className="row"
                  style={{ gap: 4, marginLeft: 'auto', color: 'var(--fg-faint)' }}
                >
                  <I.clock size={12} />
                  <span>{t.last}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'center', marginTop: 20, gap: 16 }}>
          <label className="row" style={{ fontSize: 12, color: 'var(--fg-muted)', gap: 6 }}>
            <span className="checkbox checked">
              <I.check size={10} />
            </span>
            Recordar mi última empresa
          </label>
          <a className="muted" style={{ fontSize: 12 }}>
            Cerrar sesión
          </a>
        </div>
      </div>
    </div>
  </div>
);

window.Login = Login;
window.LoginMfa = LoginMfa;
window.SeleccionarEmpresa = SeleccionarEmpresa;
