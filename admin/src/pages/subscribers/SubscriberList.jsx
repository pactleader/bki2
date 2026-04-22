import { useState, useEffect, useCallback } from 'react';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Badge, Table, TR, TD } from '../../components/PageHeader.jsx';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const SOURCE_LABELS = {
  'sidebar': 'Sidebar',
  'inline': 'In-Feed',
  'subscribe-page': 'Subscribe Page',
  'footer': 'Footer',
  'website': 'Website',
};

export default function SubscriberList() {
  const toast = useToast();
  const [data, setData]       = useState({ data: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('');
  const [page, setPage]       = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    api.listSubscribers({ search, status: filter, page, limit: 50 })
      .then(setData)
      .catch(() => toast('Failed to load', 'error'))
      .finally(() => setLoading(false));
  }, [search, filter, page]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(sub) {
    try {
      await api.deleteSubscriber(sub.id);
      toast('Deleted');
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setDeleting(null); }
  }

  async function handleStatus(sub, status) {
    try {
      await api.updateSubscriberStatus(sub.id, status);
      setData(d => ({ ...d, data: d.data.map(x => x.id === sub.id ? { ...x, status } : x) }));
    } catch (err) { toast(err.message, 'error'); }
  }

  function exportCsv() {
    const rows = [['Email', 'Status', 'Source', 'Date'], ...data.data.map(s => [s.email, s.status, s.source, fmtDate(s.created_at)])];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'subscribers.csv'; a.click();
  }

  const { meta } = data;

  return (
    <div>
      <PageHeader
        title={`Subscribers${meta.total ? ` (${meta.total})` : ''}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="outline" onClick={exportCsv}>↓ Export CSV</Btn>
          </div>
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Search email…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: '1 1 200px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 13 }}
        />
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 13 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
      </div>

      <Card style={{ padding: 0 }}>
        <Table headers={['Email', 'Source', 'Status', 'Date', '']}>
          {loading ? (
            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
          ) : data.data.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No subscribers found.</td></tr>
          ) : data.data.map(sub => (
            <TR key={sub.id}>
              <TD style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 13 }}>{sub.email}</TD>
              <TD><Badge color="var(--primary)">{SOURCE_LABELS[sub.source] || sub.source}</Badge></TD>
              <TD>
                <Badge color={sub.status === 'active' ? '#16a34a' : '#9ca3af'}>
                  {sub.status === 'active' ? 'Active' : 'Unsubscribed'}
                </Badge>
              </TD>
              <TD style={{ color: 'var(--text-muted)', fontSize: 12 }}>{fmtDate(sub.created_at)}</TD>
              <TD>
                <div style={{ display: 'flex', gap: 8 }}>
                  {sub.status === 'active'
                    ? <button onClick={() => handleStatus(sub, 'unsubscribed')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>Unsubscribe</button>
                    : <button onClick={() => handleStatus(sub, 'active')} style={{ background: 'none', border: 'none', color: '#16a34a', fontSize: 12, cursor: 'pointer' }}>Reactivate</button>
                  }
                  <button onClick={() => setDeleting(sub)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                </div>
              </TD>
            </TR>
          ))}
        </Table>
      </Card>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          <Btn variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Btn>
          <span style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {meta.pages}</span>
          <Btn variant="outline" disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Next →</Btn>
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title="Delete Subscriber"
          message={`Remove "${deleting.email}" from subscribers?`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
