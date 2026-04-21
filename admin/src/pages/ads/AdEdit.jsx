import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as api from '../../api.js';
import { getToken } from '../../auth.js';
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

// Convert datetime-local string (local) ↔ ISO/MySQL UTC string
function toInputVal(dbVal) {
  if (!dbVal) return '';
  const d = new Date(dbVal);
  if (isNaN(d)) return '';
  // datetime-local needs "YYYY-MM-DDTHH:mm"
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromInputVal(v) { return v ? new Date(v).toISOString().slice(0, 19).replace('T', ' ') : null; }

const EMPTY = { name: '', image_url: '', link_url: '', position_slug: 'sidebar-1', is_active: 1, display_order: 0, starts_at: '', expires_at: '' };

export default function AdEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isNew) {
      api.listAds().then(ads => {
        const ad = ads.find(a => String(a.id) === id);
        if (ad) setForm({ ...ad, starts_at: toInputVal(ad.starts_at), expires_at: toInputVal(ad.expires_at) });
      }).catch(() => toast('Load failed', 'error')).finally(() => setLoading(false));
    }
  }, [id]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append('image', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      set('image_url', json.url);
      toast('Image uploaded');
    } catch (err) { toast(err.message, 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name || !form.image_url || !form.position_slug) { toast('Name, image and position required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        starts_at: fromInputVal(form.starts_at),
        expires_at: fromInputVal(form.expires_at),
      };
      if (isNew) await api.createAd(payload);
      else await api.updateAd(id, payload);
      toast('Saved');
      navigate('/admin/ads');
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>;

  const inputStyle = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 4, fontFamily: 'inherit', fontSize: 13, background: '#fff',
    boxSizing: 'border-box',
  };

  return (
    <div>
      <PageHeader title={isNew ? 'New Ad' : 'Edit Ad'} action={<Link to="/admin/ads"><Btn variant="outline">← Back</Btn></Link>} />
      <Card style={{ maxWidth: 560 }}>
        <form onSubmit={save}>
          <Field label="Internal Name">
            <Input required value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>

          <Field label="Position">
            <Select value={form.position_slug} onChange={e => set('position_slug', e.target.value)}>
              {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </Select>
          </Field>

          {/* Image — upload or external URL */}
          <Field label="Ad Image">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Upload button */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ padding: '7px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1 }}>
                  {uploading ? 'Uploading…' : '↑ Upload Image'}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or paste a URL below</span>
              </div>
              {/* URL input */}
              <Input
                value={form.image_url}
                onChange={e => set('image_url', e.target.value)}
                placeholder="https://… or /uploads/filename.jpg"
              />
              {/* Preview */}
              {form.image_url && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={form.image_url} alt="Preview"
                    onError={e => e.target.style.display = 'none'}
                    style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)' }} />
                  <button type="button" onClick={() => set('image_url', '')}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>
          </Field>

          <Field label="Destination URL">
            <Input value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="https://…" />
          </Field>

          {/* Scheduling */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Scheduling</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Start Date &amp; Time</label>
                <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} style={inputStyle} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Leave blank to show immediately</span>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Expiry Date &amp; Time</label>
                <input type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} style={inputStyle} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Leave blank to never expire</span>
              </div>
            </div>
          </div>

          <Field label="Display Order">
            <Input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
          </Field>

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
