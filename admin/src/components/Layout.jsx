import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../auth.js';
import { apiLogout } from '../api.js';

const NAV = [
  { to: '/admin',           label: 'Dashboard',  icon: '▦',  exact: true },
  { to: '/admin/articles',  label: 'Articles',   icon: '✎' },
  { to: '/admin/categories',label: 'Categories', icon: '⊞' },
  { to: '/admin/events',    label: 'Events',     icon: '◷' },
  { to: '/admin/contacts',  label: 'Contacts',   icon: '✉' },
  { to: '/admin/ads',       label: 'Ads',        icon: '▣',  adminOnly: true },
  { to: '/admin/menu',      label: 'Menu',       icon: '≡',  adminOnly: true },
  { to: '/admin/homepage',  label: 'Homepage',   icon: '⌂',  adminOnly: true },
  { to: '/admin/users',     label: 'Users',      icon: '👤',  adminOnly: true },
  { to: '/admin/media',       label: 'Media',       icon: '🖼',  adminOnly: true },
  { to: '/admin/subscribers', label: 'Subscribers', icon: '📧',  adminOnly: true },
  { to: '/admin/settings',  label: 'Settings',   icon: '⚙',  adminOnly: true },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();

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
