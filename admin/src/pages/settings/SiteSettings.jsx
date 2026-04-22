import { useState, useEffect, useRef } from 'react';
import * as api from '../../api.js';
import { getToken } from '../../auth.js';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Input } from '../../components/PageHeader.jsx';

const FIELDS = [
  { key: 'site_name',        label: 'Site Name',    type: 'string' },
  { key: 'site_tagline',     label: 'Tagline',      type: 'string' },
  { key: 'site_url',         label: 'Site URL',     type: 'string' },
  { key: 'phone',            label: 'Phone',        type: 'string' },
  { key: 'address',          label: 'Address',      type: 'string' },
  { key: 'robots_meta',      label: 'Robots Meta',  type: 'string', hint: 'e.g. noindex, nofollow OR index, follow' },
];

export default function SiteSettings() {
  const toast = useToast();
  const [values, setValues]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.listSettings()
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.setting_key] = r.setting_value; });
        setValues(map);
      })
      .catch(() => toast('Load failed', 'error'));
  }, []);

  function set(k, v) { setValues(prev => ({ ...prev, [k]: v })); }

  async function handleOgUpload(e) {
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
      set('og_image_default', json.url);
      toast('Image uploaded');
    } catch (err) { toast(err.message, 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const items = [
        ...FIELDS.map(f => ({ key: f.key, value: values[f.key] || '', type: f.type })),
        { key: 'og_image_default', value: values['og_image_default'] || '', type: 'string' },
      ];
      await api.saveSettings(items);
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally { setSaving(false); }
  }

  const ogUrl = values['og_image_default'] || '';

  return (
    <div>
      <PageHeader title="Site Settings" />
      <Card style={{ maxWidth: 600 }}>
        <form onSubmit={save}>
          {FIELDS.map(f => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              <Input value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
            </Field>
          ))}

          {/* OG Image — upload or URL */}
          <Field label="Default OG Image">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOgUpload} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ padding: '7px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: uploading ? 0.6 : 1 }}>
                  {uploading ? 'Uploading…' : '↑ Upload Image'}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or paste a URL below</span>
              </div>
              <Input
                value={ogUrl}
                onChange={e => set('og_image_default', e.target.value)}
                placeholder="https://… or /uploads/filename.jpg"
              />
              {ogUrl && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={ogUrl} alt="OG preview"
                    onError={e => e.target.style.display = 'none'}
                    style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)' }} />
                  <button type="button" onClick={() => set('og_image_default', '')}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>
          </Field>

          <div style={{ marginTop: 8 }}>
            <Btn type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
