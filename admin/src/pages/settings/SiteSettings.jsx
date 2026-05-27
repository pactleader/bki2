import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [uploadingLogo, setUploadingLogo]       = useState(false);
  const [uploadingArticle, setUploadingArticle] = useState(false);
  const [partners, setPartners] = useState([]); // [{name, url}]
  const [pages, setPages]       = useState([]); // published static pages
  const fileRef        = useRef(null);
  const logoFileRef    = useRef(null);
  const articleFileRef = useRef(null);

  useEffect(() => {
    api.listSettings()
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.setting_key] = r.setting_value; });
        setValues(map);
        try { setPartners(JSON.parse(map['partners'] || '[]')); } catch { setPartners([]); }
      })
      .catch(() => toast('Load failed', 'error'));
    api.listPages()
      .then(all => setPages(all.filter(p => p.is_published)))
      .catch(() => {});
  }, []);

  function addPartner() { setPartners(p => [...p, { name: '', url: '' }]); }
  function removePartner(i) { setPartners(p => p.filter((_, idx) => idx !== i)); }
  function updatePartner(i, field, val) {
    setPartners(p => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

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

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
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
      set('logo_url', json.url);
      toast('Logo uploaded');
    } catch (err) { toast(err.message, 'error'); }
    finally { setUploadingLogo(false); if (logoFileRef.current) logoFileRef.current.value = ''; }
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
        { key: 'logo_url',               value: values['logo_url']          || '',       type: 'string' },
        { key: 'og_image_default',       value: values['og_image_default'] || '',       type: 'string' },
        { key: 'default_article_image', value: values['default_article_image'] || '',  type: 'string' },
        { key: 'openai_api_key',         value: values['openai_api_key'] || '',         type: 'string' },
        { key: 'google_ai_api_key',      value: values['google_ai_api_key'] || '',      type: 'string' },
        { key: 'partners',              value: JSON.stringify(partners.filter(p => p.name.trim())), type: 'json' },
        { key: 'custom_head_scripts',   value: values['custom_head_scripts'] || '',   type: 'string' },
        { key: 'custom_body_scripts',   value: values['custom_body_scripts'] || '',   type: 'string' },
        { key: 'custom_footer_scripts', value: values['custom_footer_scripts'] || '', type: 'string' },
        { key: 'footer_privacy_slug',    value: values['footer_privacy_slug']    || '', type: 'string' },
        { key: 'footer_terms_slug',      value: values['footer_terms_slug']      || '', type: 'string' },
        { key: 'cookie_consent_enabled', value: values['cookie_consent_enabled'] === '1' ? '1' : '0', type: 'boolean' },
        { key: 'cookie_consent_message', value: values['cookie_consent_message'] || '', type: 'string' },
        { key: 'brand_primary_color',    value: values['brand_primary_color'] || '#0d1b2a', type: 'string' },
        { key: 'brand_accent_color',     value: values['brand_accent_color']  || '#c0392b', type: 'string' },
      ];
      await api.saveSettings(items);
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally { setSaving(false); }
  }

  const [showApiKey, setShowApiKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
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

          {/* Brand Colors */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16 }}>Brand Colors</div>
            {[
              { key: 'brand_primary_color', label: 'Primary color', hint: 'Header, hero, footer background', default: '#1c3362' },
              { key: 'brand_accent_color',  label: 'Accent color',  hint: 'Buttons, links, category tags',   default: '#c0392b' },
            ].map(({ key, label, hint, default: def }) => (
              <Field key={key} label={label} hint={hint}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={values[key] || def}
                    onChange={e => set(key, e.target.value)}
                    style={{ width: 40, height: 36, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', padding: 2 }}
                  />
                  <Input
                    value={values[key] || def}
                    onChange={e => set(key, e.target.value)}
                    style={{ fontFamily: 'monospace', flex: 1 }}
                    placeholder={def}
                  />
                  <button
                    type="button"
                    onClick={() => set(key, def)}
                    style={{ padding: '0 10px', height: 36, background: '#fff', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
                  >Reset</button>
                </div>
              </Field>
            ))}
          </div>

          {/* Site Logo */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Site Logo</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Replaces the text logo in the navigation bar. Use a PNG or SVG with transparent background for best results. Recommended max height: 60px.
            </p>
            <Field label="Logo Image">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input ref={logoFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                  <button type="button" onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}
                    style={{ padding: '7px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: uploadingLogo ? 0.6 : 1 }}>
                    {uploadingLogo ? 'Uploading…' : '↑ Upload Logo'}
                  </button>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or paste a URL below</span>
                </div>
                <Input
                  value={values['logo_url'] || ''}
                  onChange={e => set('logo_url', e.target.value)}
                  placeholder="https://… or /uploads/logo.png"
                />
                {values['logo_url'] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#1c3362', borderRadius: 6 }}>
                    <img src={values['logo_url']} alt="Logo preview"
                      onError={e => e.target.style.display = 'none'}
                      style={{ height: 44, maxWidth: 200, objectFit: 'contain' }} />
                    <button type="button" onClick={() => set('logo_url', '')}
                      style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </Field>
          </div>

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

          {/* Footer Links */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 20, marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Footer Links</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Choose which static page appears as the Privacy and Terms links in the footer. Only published pages are listed.{' '}
              <span style={{ color: 'var(--accent)' }}>Create pages under <strong>Pages</strong> first.</span>
            </p>
            {[
              { key: 'footer_privacy_slug', label: 'Privacy Policy page' },
              { key: 'footer_terms_slug',   label: 'Terms of Service page' },
            ].map(({ key, label }) => (
              <Field key={key} label={label}>
                <select
                  value={values[key] || ''}
                  onChange={e => set(key, e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 14, background: '#fff' }}
                >
                  <option value="">— Not set (hidden in footer) —</option>
                  {pages.map(p => (
                    <option key={p.id} value={p.slug}>{p.title} (/p/{p.slug})</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          {/* Cookie Consent */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 20, marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Cookie Consent Banner</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Shown on first visit. The "Learn more" link points to the Privacy Policy page set above.
            </p>
            <Field label="">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={values['cookie_consent_enabled'] === '1'}
                  onChange={e => set('cookie_consent_enabled', e.target.checked ? '1' : '0')}
                  style={{ width: 16, height: 16 }}
                />
                <span>Enable cookie consent banner</span>
              </label>
            </Field>
            <Field label="Banner message">
              <Textarea
                value={values['cookie_consent_message'] || ''}
                onChange={e => set('cookie_consent_message', e.target.value)}
                placeholder="We use cookies to improve your experience…"
                style={{ minHeight: 72 }}
              />
            </Field>
          </div>

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

          {/* Partners */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 20, marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16 }}>Sidebar Partners</div>
            {partners.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <Input
                  value={p.name}
                  onChange={e => updatePartner(i, 'name', e.target.value)}
                  placeholder="Partner name"
                  style={{ flex: '1 1 160px' }}
                />
                <Input
                  value={p.url}
                  onChange={e => updatePartner(i, 'url', e.target.value)}
                  placeholder="https://…"
                  style={{ flex: '2 1 220px' }}
                />
                <button
                  type="button"
                  onClick={() => removePartner(i)}
                  style={{ padding: '0 10px', height: 36, background: 'none', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--danger)', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}
                >×</button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPartner}
              style={{ marginTop: 4, padding: '6px 14px', background: '#fff', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, cursor: 'pointer', color: 'var(--text)' }}
            >+ Add Partner</button>
          </div>

          {/* AI Image Generation */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 20, marginBottom: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>AI Image Generation</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Used for the "Generate with AI" button on the article editor. Configure one or both providers.
            </p>
            <Field label="OpenAI API Key" hint="DALL·E 3 — stored securely, never exposed to the public.">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={values['openai_api_key'] || ''}
                  onChange={e => set('openai_api_key', e.target.value)}
                  placeholder="sk-…"
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  style={{ padding: '0 12px', border: '1px solid var(--border)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  {showApiKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </Field>
            <Field label="Google AI API Key" hint="Imagen 4 via Google AI Studio — stored securely, never exposed to the public.">
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  type={showGoogleKey ? 'text' : 'password'}
                  value={values['google_ai_api_key'] || ''}
                  onChange={e => set('google_ai_api_key', e.target.value)}
                  placeholder="AIza…"
                  style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleKey(v => !v)}
                  style={{ padding: '0 12px', border: '1px solid var(--border)', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  {showGoogleKey ? 'Hide' : 'Show'}
                </button>
              </div>
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
