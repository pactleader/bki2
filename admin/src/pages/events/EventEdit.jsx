import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Input, Textarea } from '../../components/PageHeader.jsx';

const EMPTY = { title: '', event_date: '', start_date: '', end_date: '', location: '', description: '', url: '', is_active: 1, display_order: 0 };

export default function EventEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      api.listEvents().then(evs => {
        const ev = evs.find(e => String(e.id) === id);
        if (ev) setForm(ev);
      }).catch(() => toast('Load failed', 'error')).finally(() => setLoading(false));
    }
  }, [id]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    if (!form.title || !form.event_date) { toast('Title and date required', 'error'); return; }
    setSaving(true);
    try {
      if (isNew) await api.createEvent(form);
      else await api.updateEvent(id, form);
      toast('Saved');
      navigate('/admin/events');
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div>
      <PageHeader title={isNew ? 'New Event' : 'Edit Event'} action={<Link to="/admin/events"><Btn variant="outline">← Back</Btn></Link>} />
      <Card style={{ maxWidth: 560 }}>
        <form onSubmit={save}>
          <Field label="Title"><Input required value={form.title} onChange={e => set('title', e.target.value)} /></Field>
          <Field label="Display Date" hint='e.g. "September 21–23, 2026"'><Input required value={form.event_date} onChange={e => set('event_date', e.target.value)} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Start Date"><Input type="date" value={form.start_date || ''} onChange={e => set('start_date', e.target.value)} /></Field>
            <Field label="End Date"><Input type="date" value={form.end_date || ''} onChange={e => set('end_date', e.target.value)} /></Field>
          </div>
          <Field label="Location"><Input value={form.location || ''} onChange={e => set('location', e.target.value)} /></Field>
          <Field label="Description"><Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} /></Field>
          <Field label="Website URL"><Input value={form.url || ''} onChange={e => set('url', e.target.value)} placeholder="https://…" /></Field>
          <Field label="Display Order"><Input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} /></Field>
          <Field label="Status">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked ? 1 : 0)} /> Active
            </label>
          </Field>
          <Btn type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : 'Save Event'}</Btn>
        </form>
      </Card>
    </div>
  );
}
