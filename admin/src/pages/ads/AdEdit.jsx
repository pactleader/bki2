import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Input, Select } from '../../components/PageHeader.jsx';

const POSITIONS = [
  { value: 'leaderboard-top', label: 'Leaderboard Top' },
  { value: 'leaderboard-mid', label: 'Leaderboard Mid' },
  { value: 'sidebar-1',       label: 'Sidebar 1' },
  { value: 'sidebar-2',       label: 'Sidebar 2' },
  { value: 'in-feed',         label: 'In-Feed' },
  { value: 'footer-banner',   label: 'Footer Banner' },
];

const EMPTY = { name: '', image_url: '', link_url: '', position_slug: 'sidebar-1', is_active: 1, display_order: 0 };

export default function AdEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      api.listAds().then(ads => {
        const ad = ads.find(a => String(a.id) === id);
        if (ad) setForm(ad);
      }).catch(() => toast('Load failed', 'error')).finally(() => setLoading(false));
    }
  }, [id]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    if (!form.name || !form.image_url || !form.position_slug) { toast('Name, image URL and position required', 'error'); return; }
    setSaving(true);
    try {
      if (isNew) await api.createAd(form);
      else await api.updateAd(id, form);
      toast('Saved');
      navigate('/admin/ads');
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div>
      <PageHeader title={isNew ? 'New Ad' : 'Edit Ad'} action={<Link to="/admin/ads"><Btn variant="outline">← Back</Btn></Link>} />
      <Card style={{ maxWidth: 520 }}>
        <form onSubmit={save}>
          <Field label="Internal Name"><Input required value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Position">
            <Select value={form.position_slug} onChange={e => set('position_slug', e.target.value)}>
              {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Image URL">
            <Input required value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" />
          </Field>
          {form.image_url && (
            <img src={form.image_url} alt="Preview" onError={e => e.target.style.display = 'none'}
              style={{ width: '100%', maxHeight: 120, objectFit: 'contain', marginBottom: 16, borderRadius: 4, border: '1px solid var(--border)' }} />
          )}
          <Field label="Destination URL">
            <Input value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="https://…" />
          </Field>
          <Field label="Display Order"><Input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} /></Field>
          <Field label="Status">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked ? 1 : 0)} />
              Active
            </label>
          </Field>
          <Btn type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : 'Save Ad'}</Btn>
        </form>
      </Card>
    </div>
  );
}
