import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api.js';
import { getUser } from '../auth.js';
import { Badge } from '../components/PageHeader.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const user = getUser();

  useEffect(() => {
    Promise.all([
      api.listArticles({ limit: 5 }),
      api.listContacts({ is_read: 0, limit: 1 }),
      api.listArticles({ status: 'published', limit: 1 }),
      api.listArticles({ status: 'draft', limit: 1 }),
    ]).then(([articles, unread, pub, draft]) => {
      setRecent(articles.data);
      setStats({
        total: articles.meta?.total || 0,
        published: pub.meta?.total || 0,
        drafts: draft.meta?.total || 0,
        unread: unread.meta?.total || 0,
      });
    }).catch(() => {});
  }, []);

  const cards = stats ? [
    { label: 'Total Articles', value: stats.total, color: 'var(--primary)' },
    { label: 'Published',      value: stats.published, color: 'var(--success)' },
    { label: 'Drafts',         value: stats.drafts, color: 'var(--warning)' },
    { label: 'Unread Messages',value: stats.unread, color: 'var(--danger)' },
  ] : [];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Welcome, {user?.display_name}</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Here's what's happening on The Background Investigator.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map(c => (
          <div key={c.label} style={{
            background: '#fff', borderRadius: 8, padding: '20px 24px',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
            borderTop: `3px solid ${c.color}`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <Link to="/admin/articles/new" style={{
          padding: '9px 18px', background: 'var(--accent)', color: '#fff',
          borderRadius: 6, fontSize: 13, fontWeight: 600,
        }}>+ New Article</Link>
        <Link to="/admin/contacts" style={{
          padding: '9px 18px', background: '#fff', color: 'var(--text)',
          borderRadius: 6, fontSize: 13, fontWeight: 500, border: '1px solid var(--border)',
        }}>View Messages {stats?.unread > 0 && `(${stats.unread} unread)`}</Link>
      </div>

      {/* Recent articles */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Recent Articles</div>
        {recent.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--text-muted)' }}>No articles yet.</div>
        ) : recent.map(a => (
          <div key={a.id} style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {a.category?.name} · {a.author?.display_name}
              </div>
            </div>
            <Badge color={a.status === 'published' ? 'var(--success)' : 'var(--text-muted)'}>{a.status}</Badge>
            <Link to={`/admin/articles/${a.id}/edit`} style={{ fontSize: 12, color: 'var(--accent)' }}>Edit</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
