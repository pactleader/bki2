import { useState, useEffect } from 'react';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Field, Input } from '../../components/PageHeader.jsx';

const EMPTY = { label: '', url: '', display_order: 0, parent_id: '', is_active: 1, open_in_new: 0 };

export default function MenuManager() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  function load() {
    api.listMenu().then(setItems).catch(() => toast('Load failed', 'error'));
  }

  function openNew() { setForm({ ...EMPTY, display_order: items.length }); setEditing('new'); }
  function openEdit(item) {
    setForm({ label: item.label, url: item.url, display_order: item.display_order, parent_id: item.parent_id || '', is_active: item.is_active, open_in_new: item.open_in_new });
    setEditing(item);
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.label || !form.url) { toast('Label and URL required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, parent_id: form.parent_id || null };
      if (editing === 'new') await api.createMenuItem(payload);
      else await api.updateMenuItem(editing.id, payload);
      toast('Saved');
      setEditing(null);
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(item) {
    try {
      await api.deleteMenuItem(item.id);
      toast('Deleted');
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setDeleting(null); }
  }

  const topLevel = items.filter(i => !i.parent_id);

  return (
    <div>
      <PageHeader title="Menu Management" action={<Btn variant="accent" onClick={openNew}>+ Add Item</Btn>} />
      <Card style={{ padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid var(--border)' }}>
              {['Order', 'Label', 'URL', 'Parent', 'Active', 'New Tab', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 14px' }}>{item.display_order}</td>
                <td style={{ padding: '10px 14px', fontWeight: item.parent_id ? 400 : 600 }}>
                  {item.parent_id ? '↳ ' : ''}{item.label}
                </td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{item.url}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                  {item.parent_id ? items.find(i => i.id === item.parent_id)?.label : '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>{item.is_active ? '✓' : '—'}</td>
                <td style={{ padding: '10px 14px' }}>{item.open_in_new ? '✓' : '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => setDeleting(item)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No menu items.</td></tr>}
          </tbody>
        </table>
      </Card>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h3 style={{ marginBottom: 20 }}>{editing === 'new' ? 'Add Menu Item' : 'Edit Menu Item'}</h3>
            <Field label="Label"><Input value={form.label} onChange={e => set('label', e.target.value)} /></Field>
            <Field label="URL" hint="Use /slug for internal pages"><Input value={form.url} onChange={e => set('url', e.target.value)} /></Field>
            <Field label="Display Order"><Input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} /></Field>
            <Field label="Parent (optional)">
              <select value={form.parent_id} onChange={e => set('parent_id', e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, background: '#fff' }}>
                <option value="">None (top-level)</option>
                {topLevel.filter(i => editing === 'new' || i.id !== editing.id).map(i => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked ? 1 : 0)} /> Active
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={!!form.open_in_new} onChange={e => set('open_in_new', e.target.checked ? 1 : 0)} /> Open in new tab
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="outline" onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn variant="accent" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title="Delete Menu Item"
          message={`Delete "${deleting.label}"?`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
