import { useState, useEffect } from 'react';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Field, Input, Textarea, Table, TR, TD } from '../../components/PageHeader.jsx';

const EMPTY = { name: '', color_hex: '#444444', display_order: 0, description: '' };

export default function CategoryList() {
  const toast = useToast();
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | {id,...}
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  function load() {
    api.listCategories().then(setCats).catch(() => toast('Failed to load', 'error'));
  }

  function openNew() { setForm(EMPTY); setEditing('new'); }
  function openEdit(c) { setForm({ name: c.name, color_hex: c.color_hex, display_order: c.display_order, description: c.description || '' }); setEditing(c); }

  async function save() {
    if (!form.name) { toast('Name required', 'error'); return; }
    setSaving(true);
    try {
      if (editing === 'new') await api.createCategory(form);
      else await api.updateCategory(editing.id, form);
      toast('Saved');
      setEditing(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete(c) {
    try {
      await api.deleteCategory(c.id);
      toast('Deleted');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setDeleting(null); }
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div>
      <PageHeader title="Categories" action={<Btn variant="accent" onClick={openNew}>+ New Category</Btn>} />

      <Card style={{ padding: 0 }}>
        <Table headers={['', 'Name', 'Slug', 'Articles', 'Order', '']}>
          {cats.map(c => (
            <TR key={c.id}>
              <TD><span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 3, background: c.color_hex }} /></TD>
              <TD style={{ fontWeight: 500 }}>{c.name}</TD>
              <TD style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{c.slug}</TD>
              <TD>{c.article_count}</TD>
              <TD>{c.display_order}</TD>
              <TD>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => setDeleting(c)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                </div>
              </TD>
            </TR>
          ))}
          {cats.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No categories.</td></tr>}
        </Table>
      </Card>

      {/* Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <h3 style={{ marginBottom: 20 }}>{editing === 'new' ? 'New Category' : 'Edit Category'}</h3>
            <Field label="Name"><Input value={form.name} onChange={e => set('name', e.target.value)} /></Field>
            <Field label="Color">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={form.color_hex} onChange={e => set('color_hex', e.target.value)} style={{ width: 40, height: 36, border: 'none', cursor: 'pointer' }} />
                <Input value={form.color_hex} onChange={e => set('color_hex', e.target.value)} style={{ fontFamily: 'monospace' }} />
              </div>
            </Field>
            <Field label="Display Order"><Input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} /></Field>
            <Field label="Description (optional)"><Textarea value={form.description} onChange={e => set('description', e.target.value)} /></Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variant="outline" onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn variant="accent" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title="Delete Category"
          message={`Delete "${deleting.name}"? This will fail if articles are assigned to it.`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
