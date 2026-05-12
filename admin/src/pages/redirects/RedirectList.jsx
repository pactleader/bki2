import { useState, useEffect } from 'react';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Field, Input, Table, TR, TD } from '../../components/PageHeader.jsx';

const EMPTY = { from_path: '', to_url: '', is_active: true };

export default function RedirectList() {
  const toast = useToast();
  const [redirects, setRedirects] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | {id,...}
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  function load() {
    api.listRedirects().then(setRedirects).catch(() => toast('Failed to load redirects', 'error'));
  }

  function openNew() { setForm(EMPTY); setEditing('new'); }
  function openEdit(r) {
    setForm({ from_path: r.from_path, to_url: r.to_url, is_active: !!r.is_active });
    setEditing(r);
  }

  async function save() {
    if (!form.from_path || !form.to_url) { toast('Both fields are required', 'error'); return; }
    setSaving(true);
    try {
      if (editing === 'new') await api.createRedirect(form);
      else await api.updateRedirect(editing.id, form);
      toast('Saved');
      setEditing(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete(r) {
    try {
      await api.deleteRedirect(r.id);
      toast('Deleted');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setDeleting(null); }
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div>
      <PageHeader
        title="301 Redirects"
        action={<Btn variant="accent" onClick={openNew}>+ New Redirect</Btn>}
      />

      <p style={{ marginBottom: 20, color: 'var(--text-muted)', fontSize: 13 }}>
        Incoming requests matching <strong>From path</strong> are permanently redirected (301) to <strong>To URL</strong>.
      </p>

      <Card style={{ padding: 0 }}>
        <Table headers={['From path', 'To URL', 'Active', '']}>
          {redirects.map(r => (
            <TR key={r.id}>
              <TD style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.from_path}</TD>
              <TD style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.to_url}
              </TD>
              <TD>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11,
                  fontWeight: 600, background: r.is_active ? '#dcfce7' : '#f3f4f6',
                  color: r.is_active ? '#166534' : '#6b7280',
                }}>
                  {r.is_active ? 'Active' : 'Off'}
                </span>
              </TD>
              <TD>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => setDeleting(r)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                </div>
              </TD>
            </TR>
          ))}
          {redirects.length === 0 && (
            <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No redirects configured.</td></tr>
          )}
        </Table>
      </Card>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h3 style={{ marginBottom: 20 }}>{editing === 'new' ? 'New Redirect' : 'Edit Redirect'}</h3>

            <Field label="From path (e.g. /old-page)">
              <Input
                value={form.from_path}
                onChange={e => set('from_path', e.target.value)}
                placeholder="/old-article-slug"
                style={{ fontFamily: 'monospace' }}
              />
            </Field>

            <Field label="To URL (absolute or relative)">
              <Input
                value={form.to_url}
                onChange={e => set('to_url', e.target.value)}
                placeholder="/new-article-slug or https://example.com/page"
                style={{ fontFamily: 'monospace' }}
              />
            </Field>

            <Field label="Status">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => set('is_active', e.target.checked)}
                />
                Active (redirect will fire)
              </label>
            </Field>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="outline" onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn variant="accent" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title="Delete Redirect"
          message={`Delete redirect from "${deleting.from_path}"?`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
