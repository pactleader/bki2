import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getUser, logout } from '../auth.js';
import { apiLogout, listReports } from '../api.js';

const NAV = [
  { to: '/admin',           label: 'Dashboard',  icon: '▦',  exact: true },
  { to: '/admin/articles',  label: 'Articles',   icon: '✎' },
  { to: '/admin/categories',label: 'Categories', icon: '⊞' },
  { to: '/admin/events',    label: 'Events',     icon: '◷' },
  { to: '/admin/contacts',  label: 'Contact Form', icon: '✉' },
  { to: '/admin/ads',       label: 'Ads',        icon: '▣',  adminOnly: true },
  { to: '/admin/menu',      label: 'Menu',       icon: '≡',  adminOnly: true },
  { to: '/admin/homepage',  label: 'Homepage',   icon: '⌂',  adminOnly: true },
  { to: '/admin/users',     label: 'Users',      icon: '👤',  adminOnly: true },
  { to: '/admin/media',       label: 'Media',       icon: '🖼',  adminOnly: true },
  { to: '/admin/subscribers', label: 'Subscribers', icon: '📧',  adminOnly: true },
  { to: '/admin/pages',      label: 'Pages',      icon: '⊡',  adminOnly: true },
  { to: '/admin/settings',  label: 'Settings',   icon: '⚙',  adminOnly: true },
];

const TOOLS = [
  { to: '/admin/tools/import',         label: 'Import',               icon: '⇪' },
  { to: '/admin/tools/redirects',      label: 'Redirects',            icon: '↪' },
  { to: '/admin/tools/bulk-ai-images', label: 'Generate Bulk AI Images', icon: '✦' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const toolsActive = location.pathname.startsWith('/admin/tools');
  const [toolsOpen, setToolsOpen] = useState(toolsActive);
  const reportsActive = location.pathname.startsWith('/admin/reports');
  const [reportsOpen, setReportsOpen] = useState(reportsActive);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      listReports().then(setReports).catch(() => {});
    }
  }, [location.pathname, user?.role]);

  async function handleLogout() {
    try { await apiLogout(); } catch {}
    logout();
    navigate('/admin/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-w)', background: 'var(--primary)', color: '#fff',
        display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'fixed',
        top: 0, left: 0, bottom: 0, overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '.05em', color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>BKI</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Admin Panel</div>
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV.filter(n => !n.adminOnly || user?.role === 'admin').map(n => (
            <NavLink key={n.to} to={n.to} end={n.exact} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
              fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#fff' : 'rgba(255,255,255,.65)',
              background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
              transition: 'all .15s',
            })}>
              <span style={{ fontSize: 14 }}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}

          {/* Tools group — admin only */}
          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => setToolsOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                  width: '100%', background: toolsOpen ? 'rgba(255,255,255,.07)' : 'transparent',
                  border: 'none', borderLeft: toolsActive ? '3px solid var(--accent)' : '3px solid transparent',
                  color: toolsActive ? '#fff' : 'rgba(255,255,255,.65)',
                  fontSize: 13, fontWeight: toolsActive ? 600 : 400, cursor: 'pointer',
                  transition: 'all .15s', justifyContent: 'space-between',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>🔧</span> Tools
                </span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>{toolsOpen ? '▲' : '▼'}</span>
              </button>
              {toolsOpen && TOOLS.map(n => (
                <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 8px 36px',
                  fontSize: 12, fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
                  background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'all .15s',
                })}>
                  <span style={{ fontSize: 13 }}>{n.icon}</span>
                  {n.label}
                </NavLink>
              ))}

              {/* Reports group — expandable, shows individual reports */}
              <button
                onClick={() => setReportsOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                  width: '100%', background: reportsOpen ? 'rgba(255,255,255,.07)' : 'transparent',
                  border: 'none', borderLeft: reportsActive ? '3px solid var(--accent)' : '3px solid transparent',
                  color: reportsActive ? '#fff' : 'rgba(255,255,255,.65)',
                  fontSize: 13, fontWeight: reportsActive ? 600 : 400, cursor: 'pointer',
                  transition: 'all .15s', justifyContent: 'space-between',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14 }}>📊</span> Reports
                </span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>{reportsOpen ? '▲' : '▼'}</span>
              </button>
              {reportsOpen && (
                <>
                  <NavLink to="/admin/reports" end style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 8px 36px',
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
                    background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'all .15s',
                  })}>
                    <span style={{ fontSize: 13 }}>▤</span>
                    All Reports
                  </NavLink>
                  <NavLink to="/admin/reports/new" style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 8px 36px',
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#fff' : 'rgba(255,255,255,.55)',
                    background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    transition: 'all .15s',
                  })}>
                    <span style={{ fontSize: 13 }}>+</span>
                    New Report
                  </NavLink>
                  {reports.length > 0 && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', padding: '10px 16px 4px 36px', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      Reports
                    </div>
                  )}
                  {reports.map(r => (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center',
                      padding: '7px 12px 7px 36px', gap: 6,
                      borderLeft: '3px solid transparent',
                    }}>
                      <a
                        href={`/r/${r.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
                          fontSize: 12, color: 'rgba(255,255,255,.55)',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.55)'}
                      >
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: r.is_published ? '#10b981' : '#6b7280', flexShrink: 0,
                        }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      </a>
                      <NavLink
                        to={`/admin/reports/${r.id}/edit`}
                        title="Edit"
                        style={({ isActive }) => ({
                          fontSize: 11, color: isActive ? '#fff' : 'rgba(255,255,255,.4)',
                          textDecoration: 'none', padding: '2px 6px', borderRadius: 3,
                          background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
                          flexShrink: 0,
                        })}
                      >✎</NavLink>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'rgba(255,255,255,.55)', marginBottom: 12,
            textDecoration: 'none', padding: '6px 0',
          }}>
            <span style={{ fontSize: 13 }}>↗</span> Visit Website
          </a>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 2 }}>{user?.display_name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>{user?.role}</div>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,.1)', border: 'none', color: 'rgba(255,255,255,.7)',
            borderRadius: 4, padding: '6px 12px', fontSize: 12, width: '100%', cursor: 'pointer',
          }}>Logout</button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1100 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
