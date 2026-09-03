import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as api from '../../api.js';
import { getToken } from '../../auth.js';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Input, Select } from '../../components/PageHeader.jsx';

const POSITIONS = [
  { value: 'leaderboard-top', label: 'Leaderboard Top' },
  { value: 'leaderboard-mid', label: 'Leaderboard Mid' },
  { value: 'sidebar-1',       label: 'Sidebar — Slot 1 (top)' },
  { value: 'sidebar-2',       label: 'Sidebar — Slot 2' },
  { value: 'sidebar-3',       label: 'Sidebar — Slot 3' },
  { value: 'sidebar-4',       label: 'Sidebar — Slot 4' },
  { value: 'sidebar-5',       label: 'Sidebar — Slot 5 (bottom)' },
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

// Detect what kind of media a URL points to. Returns: 'image' | 'video' | 'youtube' | 'vimeo' | 'unknown'
function detectMediaType(url) {
  if (!url) return 'unknown';
  const u = String(url).toLowerCase();
  if (/\.(mp4|webm|ogv|mov)(\?|$)/.test(u)) return 'video';
  if (/(?:youtube\.com|youtu\.be)/.test(u)) return 'youtube';
  if (/vimeo\.com/.test(u)) return 'vimeo';
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/.test(u)) return 'image';
  return 'image'; // default assumption for unknown URLs
}

function youtubeEmbed(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1&loop=1&playlist=${m[1]}&controls=0&modestbranding=1&rel=0` : url;
}
function vimeoEmbed(url) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1&muted=1&loop=1&background=1` : url;
}

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
      toast(`${json.type === 'video' ? 'Video' : 'Image'} uploaded`);
    } catch (err) { toast(err.message, 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name || !form.image_url || !form.position_slug) { toast('Name, media and position required', 'error'); return; }
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

          {/* Media — upload image/video or external URL (YouTube, Vimeo, etc.) */}
          <Field label="Ad Media (image or video)">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Upload button */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ padding: '7px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1 }}>
                  {uploading ? 'Uploading…' : '↑ Upload Image/Video'}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or paste a URL below (image, .mp4, YouTube, Vimeo)</span>
              </div>
              {/* URL input */}
              <Input
                value={form.image_url}
                onChange={e => set('image_url', e.target.value)}
                placeholder="https://… or /uploads/filename.mp4"
              />
              {/* Preview */}
              {form.image_url && (() => {
                const mediaType = detectMediaType(form.image_url);
                return (
                  <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: 400 }}>
                    {mediaType === 'video' ? (
                      <video src={form.image_url} controls muted playsInline
                        style={{ width: '100%', maxHeight: 200, borderRadius: 4, border: '1px solid var(--border)', background: '#000' }} />
                    ) : mediaType === 'youtube' ? (
                      <iframe src={youtubeEmbed(form.image_url)} title="YouTube preview" allow="autoplay; encrypted-media" allowFullScreen
                        style={{ width: '100%', height: 200, borderRadius: 4, border: '1px solid var(--border)' }} />
                    ) : mediaType === 'vimeo' ? (
                      <iframe src={vimeoEmbed(form.image_url)} title="Vimeo preview" allow="autoplay"
                        style={{ width: '100%', height: 200, borderRadius: 4, border: '1px solid var(--border)' }} />
                    ) : (
                      <img src={form.image_url} alt="Preview"
                        onError={e => e.target.style.display = 'none'}
                        style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)' }} />
                    )}
                    <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>
                      {mediaType}
                    </div>
                    <button type="button" onClick={() => set('image_url', '')}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                );
              })()}
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
