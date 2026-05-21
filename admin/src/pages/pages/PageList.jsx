import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Table, TR, TD } from '../../components/PageHeader.jsx';

export default function PageList() {
  const toast = useToast();
  const navigate = useNavigate();
  const [pages, setPages] = useState([]);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { load(); }, []);

  function load() {
    api.listPages().then(setPages).catch(() => toast('Failed to load pages', 'error'));
  }

  async function handleDelete(p) {
    try {
      await api.deletePage(p.id);
      toast('Deleted');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setDeleting(null); }
  }

  return (
    <div>
      <PageHeader
        title="Static Pages"
        action={<Btn variant="accent" onClick={() => navigate('/admin/pages/new')}>+ New Page</Btn>}
      />

      <Card style={{ padding: 0 }}>
        <Table headers={['Title', 'Slug / URL', 'Status', 'Last updated', '']}>
          {pages.map(p => (
            <TR key={p.id}>
              <TD style={{ fontWeight: 500 }}>{p.title}</TD>
              <TD>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>/p/{p.slug}</span>
                {p.is_published ? (
                  <a
                    href={`/p/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)' }}
                  >↗ View</a>
                ) : null}
              </TD>
              <TD>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: p.is_published ? '#dcfce7' : '#f3f4f6',
                  color: p.is_published ? '#166534' : '#6b7280',
                }}>
                  {p.is_published ? 'Published' : 'Draft'}
                </span>
              </TD>
              <TD style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(p.updated_at).toLocaleDateString()}
              </TD>
              <TD>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/admin/pages/${p.id}/edit`)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}
                  >Edit</button>
                  <button
                    onClick={() => setDeleting(p)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}
                  >Delete</button>
                </div>
              </TD>
            </TR>
          ))}
          {pages.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No pages yet.</td></tr>
          )}
        </Table>
      </Card>

      {deleting && (
        <ConfirmModal
          title="Delete Page"
          message={`Delete "${deleting.title}"? This cannot be undone.`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
