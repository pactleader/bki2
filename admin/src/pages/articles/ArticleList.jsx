import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api.js';
import PageHeader, { Btn, Card, Badge, Table, TR, TD } from '../../components/PageHeader.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { useToast } from '../../components/Toast.jsx';

export default function ArticleList() {
  const toast = useToast();
  const [view, setView] = useState('list'); // 'list' | 'trash'

  return view === 'trash'
    ? <TrashView onBack={() => setView('list')} />
    : <ListView onTrash={() => setView('trash')} />;
}

function ListView({ onTrash }) {
  const toast = useToast();
  const [articles, setArticles] = useState([]);
  const [meta, setMeta] = useState({});
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ status: '', category_id: '', search: '', sort: 'recent', page: 1 });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { api.listCategories().then(setCategories).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    api.listArticles(params)
      .then(res => { setArticles(res.data); setMeta(res.meta); })
      .catch(() => toast('Failed to load articles', 'error'))
      .finally(() => setLoading(false));
  }, [filters]);

  async function handleDelete(id) {
    try {
      await api.deleteArticle(id);
      setArticles(a => a.filter(x => x.id !== id));
      toast('Article moved to trash');
    } catch (err) {
      toast(err.message, 'error');
    } finally { setDeleting(null); }
  }

  async function handleTogglePublish(article) {
    try {
      if (article.status === 'published') await api.unpublishArticle(article.id);
      else await api.publishArticle(article.id);
      setFilters(f => ({ ...f }));
      toast('Status updated');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Articles"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={onTrash} variant="outline">Trash</Btn>
            <Link to="/admin/articles/new"><Btn variant="accent">+ New Article</Btn></Link>
          </div>
        }
      />

      <Card style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            placeholder="Search…" value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            style={{ flex: 1, minWidth: 180, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }}
          />
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff' }}>
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
          </select>
          <select value={filters.category_id} onChange={e => setFilters(f => ({ ...f, category_id: e.target.value, page: 1 }))}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff' }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value, page: 1 }))}
            style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff' }}>
            <option value="recent">Most Recent</option>
            <option value="views">Most Views</option>
            <option value="edited">Last Edited</option>
          </select>
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div> : (
          <Table headers={['Title', 'Category', 'Author', 'Status', filters.sort === 'edited' ? 'Last Edited' : 'Publish Date', 'Views', '']}>
            {articles.map(a => (
              <TR key={a.id}>
                <TD>
                  {a.status === 'published' && a.slug ? (
                    <a href={`/Articles/${a.slug}/${a.id}/`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontWeight: 500, maxWidth: 320, display: 'block', color: 'inherit', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                      {a.title}
                    </a>
                  ) : (
                    <div style={{ fontWeight: 500, maxWidth: 320 }}>{a.title}</div>
                  )}
                </TD>
                <TD><Badge color={a.category?.color_hex}>{a.category?.name}</Badge></TD>
                <TD style={{ color: 'var(--text-muted)' }}>{a.author?.display_name}</TD>
                <TD>
                  <Badge color={a.status === 'published' ? 'var(--success)' : a.status === 'scheduled' ? '#d97706' : '#888'}>{a.status}</Badge>
                </TD>
                <TD style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {(() => {
                    const raw = filters.sort === 'edited' ? a.updated_at : a.publish_date;
                    if (!raw) return '—';
                    // Replace space with T so JS parses as local time, not UTC
                    const d = new Date(String(raw).replace(' ', 'T'));
                    if (isNaN(d)) return '—';
                    return a.status === 'scheduled'
                      ? d.toLocaleString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
                      : d.toLocaleDateString();
                  })()}
                </TD>
                <TD style={{ color: 'var(--text-muted)' }}>{a.view_count}</TD>
                <TD>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/admin/articles/${a.id}/edit`} style={{ color: 'var(--primary)', fontSize: 12 }}>Edit</Link>
                    <button onClick={() => handleTogglePublish(a)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer' }}>
                      {a.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => setDeleting(a)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>
                      Trash
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No articles found.</td></tr>
            )}
          </Table>
        )}

        {meta.pages > 1 && (
          <div style={{ padding: 16, display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <PaginationBtn disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>‹ Prev</PaginationBtn>
            {paginationWindow(filters.page, meta.pages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '4px 6px', fontSize: 13, color: 'var(--text-muted)' }}>…</span>
              ) : (
                <PaginationBtn key={p} active={filters.page === p} onClick={() => setFilters(f => ({ ...f, page: p }))}>{p}</PaginationBtn>
              )
            )}
            <PaginationBtn disabled={filters.page >= meta.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next ›</PaginationBtn>
          </div>
        )}
      </Card>

      {deleting && (
        <ConfirmModal
          title="Move to Trash"
          message={`Move "${deleting.title}" to trash? You can restore it later.`}
          onConfirm={() => handleDelete(deleting.id)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function TrashView({ onBack }) {
  const toast = useToast();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null); // { id, title, action: 'restore'|'permanent' }

  function load() {
    setLoading(true);
    api.listTrash()
      .then(res => setArticles(res.data))
      .catch(() => toast('Failed to load trash', 'error'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleConfirm() {
    const { id, action } = confirming;
    setConfirming(null);
    try {
      if (action === 'restore') {
        await api.restoreArticle(id);
        setArticles(a => a.filter(x => x.id !== id));
        toast('Article restored');
      } else {
        await api.permanentDelete(id);
        setArticles(a => a.filter(x => x.id !== id));
        toast('Article permanently deleted');
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Trash"
        action={<Btn onClick={onBack} variant="ghost">← Back to Articles</Btn>}
      />

      <Card style={{ padding: 0 }}>
        {loading ? <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div> : (
          <Table headers={['Title', 'Category', 'Author', 'Status', 'Deleted', '']}>
            {articles.map(a => (
              <TR key={a.id}>
                <TD><div style={{ fontWeight: 500, maxWidth: 340, color: 'var(--text-muted)' }}>{a.title}</div></TD>
                <TD><Badge color={a.category?.color_hex}>{a.category?.name}</Badge></TD>
                <TD style={{ color: 'var(--text-muted)' }}>{a.author?.display_name}</TD>
                <TD><Badge color="#888">{a.status}</Badge></TD>
                <TD style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {a.deleted_at ? new Date(a.deleted_at).toLocaleDateString() : '—'}
                </TD>
                <TD>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setConfirming({ id: a.id, title: a.title, action: 'restore' })}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}>
                      Restore
                    </button>
                    <button
                      onClick={() => setConfirming({ id: a.id, title: a.title, action: 'permanent' })}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>
                      Delete Forever
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Trash is empty.</td></tr>
            )}
          </Table>
        )}
      </Card>

      {confirming && (
        <ConfirmModal
          title={confirming.action === 'restore' ? 'Restore Article' : 'Delete Forever'}
          message={confirming.action === 'restore'
            ? `Restore "${confirming.title}"?`
            : `Permanently delete "${confirming.title}"? This cannot be undone.`}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function paginationWindow(current, total) {
  const delta = 2;
  const pages = [];
  const rangeStart = Math.max(2, current - delta);
  const rangeEnd   = Math.min(total - 1, current + delta);
  pages.push(1);
  if (rangeStart > 2) pages.push('…');
  for (let p = rangeStart; p <= rangeEnd; p++) pages.push(p);
  if (rangeEnd < total - 1) pages.push('…');
  if (total > 1) pages.push(total);
  return pages;
}

function PaginationBtn({ children, onClick, active, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)',
      background: active ? 'var(--primary)' : '#fff',
      color: active ? '#fff' : disabled ? 'var(--text-muted)' : 'var(--text)',
      cursor: disabled ? 'default' : 'pointer',
      fontSize: 13, opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}
