import { useState, useEffect, useRef } from 'react';
import * as api from '../../api.js';
import { getToken } from '../../auth.js';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Input, Textarea } from '../../components/PageHeader.jsx';

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
  const [uploading, setUploading]       = useState(false);
  const [uploadingArticle, setUploadingArticle] = useState(false);
  const fileRef        = useRef(null);
  const articleFileRef = useRef(null);

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

  async function handleArticleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingArticle(true);
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
      set('default_article_image', json.url);
      toast('Image uploaded');
    } catch (err) { toast(err.message, 'error'); }
    finally { setUploadingArticle(false); if (articleFileRef.current) articleFileRef.current.value = ''; }
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const items = [
        ...FIELDS.map(f => ({ key: f.key, value: values[f.key] || '', type: f.type })),
        { key: 'og_image_default',       value: values['og_image_default'] || '',       type: 'string' },
        { key: 'default_article_image', value: values['default_article_image'] || '', type: 'string' },
        { key: 'custom_head_scripts',   value: values['custom_head_scripts'] || '',   type: 'string' },
        { key: 'custom_body_scripts',   value: values['custom_body_scripts'] || '',   type: 'string' },
        { key: 'custom_footer_scripts', value: values['custom_footer_scripts'] || '', type: 'string' },
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

          {/* Default Article Image */}
          <Field label="Default Article Image" hint="Shown on any article that has no featured image set.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input ref={articleFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleArticleImageUpload} />
                <button type="button" onClick={() => articleFileRef.current?.click()} disabled={uploadingArticle}
                  style={{ padding: '7px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: uploadingArticle ? 0.6 : 1 }}>
                  {uploadingArticle ? 'Uploading…' : '↑ Upload Image'}
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or paste a URL below</span>
              </div>
              <Input
                value={values['default_article_image'] || ''}
                onChange={e => set('default_article_image', e.target.value)}
                placeholder="https://… or /uploads/filename.jpg"
              />
              {values['default_article_image'] && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={values['default_article_image']} alt="Article image preview"
                    onError={e => e.target.style.display = 'none'}
                    style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--border)' }} />
                  <button type="button" onClick={() => set('default_article_image', '')}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 13, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>
          </Field>

          {/* Custom Scripts */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 20, marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16 }}>Custom Scripts</div>

            <Field label="Head Scripts" hint="Injected inside <head> — ideal for Google Analytics, Meta Pixel, etc.">
              <Textarea
                value={values['custom_head_scripts'] || ''}
                onChange={e => set('custom_head_scripts', e.target.value)}
                placeholder={'<!-- Google Analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>\n<script>...</script>'}
                style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 120, resize: 'vertical' }}
              />
            </Field>

            <Field label="Body Scripts" hint="Injected at the end of <body> — ideal for chat widgets, heat-maps, etc.">
              <Textarea
                value={values['custom_body_scripts'] || ''}
                onChange={e => set('custom_body_scripts', e.target.value)}
                placeholder={'<!-- Intercom / HubSpot / etc. -->\n<script>...</script>'}
                style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 120, resize: 'vertical' }}
              />
            </Field>

            <Field label="Footer Scripts" hint="Injected after the footer element — ideal for conversion pixels, retargeting, etc.">
              <Textarea
                value={values['custom_footer_scripts'] || ''}
                onChange={e => set('custom_footer_scripts', e.target.value)}
                placeholder={'<!-- Retargeting pixel / conversion tag -->\n<script>...</script>'}
                style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 120, resize: 'vertical' }}
              />
            </Field>
          </div>

          <div style={{ marginTop: 8 }}>
            <Btn type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
