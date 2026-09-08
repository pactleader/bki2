import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Table, TR, TD } from '../../components/PageHeader.jsx';

export default function ReportList() {
  const toast = useToast();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { load(); }, []);

  function load() {
    api.listReports().then(setReports).catch(() => toast('Failed to load reports', 'error'));
  }

  async function handleDelete(r) {
    try {
      await api.deleteReport(r.id);
      toast('Deleted');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setDeleting(null); }
  }

  async function move(r, direction) {
    const sorted = [...reports].sort((a, b) => (a.display_order - b.display_order) || (a.id - b.id));
    const idx = sorted.findIndex(x => x.id === r.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    try {
      await Promise.all([
        api.updateReport(a.id, { ...a, display_order: b.display_order }),
        api.updateReport(b.id, { ...b, display_order: a.display_order }),
      ]);
      load();
    } catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        action={<Btn variant="accent" onClick={() => navigate('/admin/reports/new')}>+ New Report</Btn>}
      />

      <Card style={{ padding: 0 }}>
        <Table headers={['Order', 'Title', 'Slug / URL', 'Status', 'Last updated', '']}>
          {reports.map((r, idx) => (
            <TR key={r.id}>
              <TD>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                  <button onClick={() => move(r, -1)} disabled={idx === 0} style={{ width: 22, height: 20, border: '1px solid var(--border)', borderRadius: 3, background: idx === 0 ? '#f3f4f6' : '#fff', color: idx === 0 ? '#d1d5db' : 'var(--primary)', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 11, padding: 0 }}>↑</button>
                  <button onClick={() => move(r, 1)} disabled={idx === reports.length - 1} style={{ width: 22, height: 20, border: '1px solid var(--border)', borderRadius: 3, background: idx === reports.length - 1 ? '#f3f4f6' : '#fff', color: idx === reports.length - 1 ? '#d1d5db' : 'var(--primary)', cursor: idx === reports.length - 1 ? 'default' : 'pointer', fontSize: 11, padding: 0 }}>↓</button>
                </div>
              </TD>
              <TD style={{ fontWeight: 500 }}>{r.title}</TD>
              <TD>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>/r/{r.slug}</span>
                {r.is_published ? (
                  <a href={`/r/${r.slug}`} target="_blank" rel="noopener noreferrer"
                    style={{ marginLeft: 8, fontSize: 11, color: 'var(--accent)' }}
                  >↗ View</a>
                ) : null}
              </TD>
              <TD>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: r.is_published ? '#dcfce7' : '#f3f4f6',
                  color: r.is_published ? '#166534' : '#6b7280',
                }}>
                  {r.is_published ? 'Published' : 'Draft'}
                </span>
              </TD>
              <TD style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(r.updated_at).toLocaleDateString()}
              </TD>
              <TD>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/admin/reports/${r.id}/edit`)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}
                  >Edit</button>
                  <button
                    onClick={() => setDeleting(r)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}
                  >Delete</button>
                </div>
              </TD>
            </TR>
          ))}
          {reports.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No reports yet.</td></tr>
          )}
        </Table>
      </Card>

      {deleting && (
        <ConfirmModal
          title="Delete Report"
          message={`Delete "${deleting.title}"? This cannot be undone.`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
