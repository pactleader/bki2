export default function PageHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>{title}</h1>
      {action}
    </div>
  );
}

export function Btn({ children, onClick, variant = 'primary', type = 'button', disabled, style = {} }) {
  const variants = {
    primary: { background: 'var(--primary)', color: '#fff', border: 'none' },
    accent:  { background: 'var(--accent)',  color: '#fff', border: 'none' },
    outline: { background: '#fff', color: 'var(--text)', border: '1px solid var(--border)' },
    danger:  { background: 'var(--danger)',  color: '#fff', border: 'none' },
    success: { background: 'var(--success)', color: '#fff', border: 'none' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .6 : 1,
      ...variants[variant], ...style,
    }}>
      {children}
    </button>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 8,
      border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
      padding: 24, ...style,
    }}>
      {children}
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {label && <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>{label}</label>}
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function Input({ style = {}, ...props }) {
  return (
    <input style={{
      width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
      borderRadius: 6, fontSize: 14, outline: 'none', ...style,
    }} {...props} />
  );
}

export function Select({ children, style = {}, ...props }) {
  return (
    <select style={{
      width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
      borderRadius: 6, fontSize: 14, background: '#fff', ...style,
    }} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ style = {}, ...props }) {
  return (
    <textarea style={{
      width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
      borderRadius: 6, fontSize: 14, resize: 'vertical', minHeight: 80,
      fontFamily: 'inherit', ...style,
    }} {...props} />
  );
}

export function Badge({ children, color = '#444' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: 11, fontWeight: 600, background: color + '22', color,
      textTransform: 'uppercase', letterSpacing: '.04em',
    }}>
      {children}
    </span>
  );
}

export function Table({ headers, children }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid var(--border)' }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TR({ children }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
      onMouseLeave={e => e.currentTarget.style.background = ''}>
      {children}
    </tr>
  );
}

export function TD({ children, style = {} }) {
  return <td style={{ padding: '10px 14px', ...style }}>{children}</td>;
}
