import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as api from '../../api.js';
import { getUser } from '../../auth.js';
import QuillEditor from '../../components/QuillEditor.jsx';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Input, Select, Textarea, Badge } from '../../components/PageHeader.jsx';

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/--+/g, '-');
}

// Convert a UTC datetime string from the server to a datetime-local value in the given timezone
function utcToLocalInput(utcStr, tz) {
  if (!utcStr) return '';
  const s = String(utcStr).replace(' ', 'T');
  const d = new Date(s.endsWith('Z') ? s : s + 'Z');
  if (isNaN(d)) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d);
    const get = type => parts.find(p => p.type === type)?.value || '00';
    const h = get('hour') === '24' ? '00' : get('hour');
    return `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}`;
  } catch { return String(utcStr).replace(' ', 'T').slice(0, 16); }
}

const EMPTY = {
  title: '', slug: '', excerpt: '', body: '', featured_image: '', featured_image_alt: '',
  category_id: '', status: 'draft', publish_date: '',
  seo_title: '', seo_description: '', seo_keywords: '', og_image: '', schema_json: '',
  source_name: '', source_url: '', extra_category_ids: [],
};

// Detect what kind of media a URL points to
function detectMediaType(url) {
  if (!url) return 'image';
  const u = String(url).toLowerCase();
  if (/\.(mp4|webm|ogv|mov)(\?|$)/.test(u)) return 'video';
  if (/(?:youtube\.com|youtu\.be)/.test(u)) return 'youtube';
  if (/vimeo\.com/.test(u)) return 'vimeo';
  return 'image';
}
function youtubeEmbed(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1&loop=1&playlist=${m[1]}&controls=1&modestbranding=1&rel=0` : url;
}
function vimeoEmbed(url) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}?autoplay=1&muted=1&loop=1` : url;
}

function FeaturedImageUpload({ value, onChange, altValue, onAltChange, articleTitle = '', authorName = '', articleBody = '' }) {
  const fileRef  = useRef();
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [aiOpen,    setAiOpen]    = useState(false);
  const [meta, setMeta] = useState({ title: '', description: '', author: '', copyright: '' });
  const [metaOpen, setMetaOpen] = useState(false);

  function setM(k, v) { setMeta(m => ({ ...m, [k]: v })); }

  // Effective metadata: use field value or fall back to auto values
  function effectiveMeta() {
    return {
      title:       meta.title       || articleTitle,
      description: meta.description || articleTitle,
      author:      meta.author      || authorName,
      copyright:   meta.copyright,
    };
  }

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { getToken } = await import('../../auth.js');
      const fd = new FormData();
      fd.append('image', file);
      const em = effectiveMeta();
      if (em.title)       fd.append('title',       em.title);
      if (em.description) fd.append('description', em.description);
      if (em.author)      fd.append('author',      em.author);
      if (em.copyright)   fd.append('copyright',   em.copyright);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.url);
      if (!altValue && articleTitle) onAltChange?.(articleTitle);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <Field label="Featured Media (image or video)">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Upload, generate, or paste a URL (image, .mp4, YouTube, Vimeo)…"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            disabled={uploading}
            style={{
              padding: '0 14px', height: 36, background: '#0d1b2a', color: '#fff',
              border: 'none', borderRadius: 4, cursor: uploading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--f-ui, sans-serif)', fontSize: 13, whiteSpace: 'nowrap',
              opacity: uploading ? 0.6 : 1,
            }}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        {error && <p style={{ color: '#c0392b', fontSize: 12, marginTop: 4 }}>{error}</p>}
      </Field>

      {/* Image Metadata — hidden for videos */}
      {detectMediaType(value) === 'image' && (
      <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setMetaOpen(o => !o)}
          style={{
            width: '100%', padding: '6px 10px', background: '#f8f9fa', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}
        >
          <span>Image Metadata <span style={{ fontWeight: 400, textTransform: 'none' }}>(embedded into file)</span></span>
          <span>{metaOpen ? '▲' : '▼'}</span>
        </button>
        {metaOpen && (
          <div style={{ padding: '10px 10px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { key: 'title',       label: 'Title',       placeholder: articleTitle || 'Image title…' },
              { key: 'description', label: 'Description', placeholder: articleTitle || 'Brief description…' },
              { key: 'author',      label: 'Author',      placeholder: authorName   || 'Photographer / creator…' },
              { key: 'copyright',   label: 'Copyright',   placeholder: `© ${new Date().getFullYear()}…` },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', width: 76, flexShrink: 0 }}>{label}</label>
                <Input
                  value={meta[key]}
                  onChange={e => setM(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ flex: 1, fontSize: 12 }}
                />
              </div>
            ))}
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 6px' }}>
              Leave blank to auto-fill from article title / author. Embedded on upload or AI generate.
            </p>
          </div>
        )}
      </div>
      )}

      {/* Generate with AI button — image only */}
      {detectMediaType(value) === 'image' && (
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          style={{
            marginTop: 8, width: '100%', padding: '7px 0',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            color: '#a78bfa', border: '1px solid #4c1d95', borderRadius: 4,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '.02em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>✦</span> Generate with AI
        </button>
      )}

      {value && (() => {
        const mt = detectMediaType(value);
        return (
        <div style={{ marginTop: 8 }}>
          <div style={{ position: 'relative' }}>
            {mt === 'video' ? (
              <video src={value} controls muted playsInline
                style={{ width: '100%', borderRadius: 4, maxHeight: 220, background: '#000', display: 'block' }} />
            ) : mt === 'youtube' ? (
              <iframe src={youtubeEmbed(value)} title="YouTube preview" allow="autoplay; encrypted-media" allowFullScreen
                style={{ width: '100%', height: 220, borderRadius: 4, border: 'none', display: 'block' }} />
            ) : mt === 'vimeo' ? (
              <iframe src={vimeoEmbed(value)} title="Vimeo preview" allow="autoplay"
                style={{ width: '100%', height: 220, borderRadius: 4, border: 'none', display: 'block' }} />
            ) : (
              <img
                src={value} alt="Preview"
                onError={e => e.target.style.display = 'none'}
                style={{ width: '100%', borderRadius: 4, maxHeight: 180, objectFit: 'cover', display: 'block' }}
              />
            )}
            <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.05em' }}>
              {mt}
            </div>
            <button
              type="button"
              onClick={() => { onChange(''); onAltChange?.(''); }}
              style={{
                position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)',
                color: '#fff', border: 'none', borderRadius: 3, padding: '2px 8px',
                fontSize: 12, cursor: 'pointer',
              }}
            >Remove</button>
          </div>
          <div style={{ marginTop: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Alt Text <span style={{ fontWeight: 400 }}>(auto-filled from title if blank)</span>
            </label>
            <Input
              value={altValue || ''}
              onChange={e => onAltChange?.(e.target.value)}
              placeholder={articleTitle || 'Describe the image…'}
            />
          </div>
        </div>
        );
      })()}

      {aiOpen && (
        <AiGenerateModal
          articleTitle={articleTitle}
          articleBody={articleBody}
          metadata={effectiveMeta()}
          onAccept={url => { onChange(url); if (!altValue && articleTitle) onAltChange?.(articleTitle); setAiOpen(false); }}
          onClose={() => setAiOpen(false)}
        />
      )}
    </div>
  );
}

function AiGenerateModal({ articleTitle = '', articleBody = '', metadata = {}, onAccept, onClose }) {
  const [prompt,      setPrompt]      = useState('');
  const [suggesting,  setSuggesting]  = useState(true);
  const [provider,    setProvider]    = useState('openai');
  const [generating,  setGenerating]  = useState(false);
  const [previewUrl,  setPreviewUrl]  = useState(null);
  const [error,       setError]       = useState('');

  useEffect(() => {
    setSuggesting(true);
    api.suggestImagePrompt(articleTitle, articleBody)
      .then(res => setPrompt(res.prompt || ''))
      .catch(() => setPrompt(articleTitle ? `A high-quality newspaper headline image for: "${articleTitle}". Professional, photorealistic, no text.` : ''))
      .finally(() => setSuggesting(false));
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setPreviewUrl(null);
    try {
      const res = await api.generateImage(prompt, provider, metadata);
      setPreviewUrl(res.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, width: '100%', maxWidth: 560,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, color: '#a78bfa' }}>✦</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>Generate Image with AI</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Prompt */}
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            {suggesting ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, border: '2px solid #c4b5fd', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Analyzing article and suggesting prompt…
              </span>
            ) : 'Prompt (AI suggested — edit as needed)'}
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={4}
            disabled={suggesting}
            style={{
              width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)',
              borderRadius: 4, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              opacity: suggesting ? 0.5 : 1,
            }}
            placeholder={suggesting ? 'Generating suggestion…' : 'Describe the image you want…'}
          />
          {/* Provider toggle */}
          <div style={{ display: 'flex', gap: 6, margin: '10px 0 16px' }}>
            {[
              { value: 'openai', label: 'OpenAI DALL·E 3' },
              { value: 'google', label: 'Google Imagen 4' },
            ].map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => { setProvider(p.value); setPreviewUrl(null); setError(''); }}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, borderRadius: 4,
                  cursor: 'pointer', fontFamily: 'inherit',
                  border: provider === p.value ? '2px solid #7c3aed' : '1px solid var(--border)',
                  background: provider === p.value ? '#f5f3ff' : '#fff',
                  color: provider === p.value ? '#7c3aed' : 'var(--text-muted)',
                }}
              >{p.label}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '-10px 0 16px' }}>
            {provider === 'openai' ? 'DALL·E 3 — 1792×1024, landscape.' : 'Imagen 4 — 16:9, high quality.'}
            {' '}Be specific for best results.
          </p>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || suggesting || !prompt.trim()}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 4, border: 'none',
              background: generating || suggesting || !prompt.trim() ? '#c4b5fd' : '#7c3aed',
              color: '#fff', fontWeight: 600, fontSize: 13,
              cursor: generating || suggesting || !prompt.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {generating ? (
              <>
                <span style={{
                  display: 'inline-block', width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
                Generating… (up to 30s)
              </>
            ) : (
              <><span>✦</span> {previewUrl ? 'Regenerate' : 'Generate'}</>
            )}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* Error */}
          {error && (
            <p style={{ color: '#c0392b', fontSize: 12, marginTop: 10, padding: '8px 10px', background: '#fef2f2', borderRadius: 4, border: '1px solid #fecaca' }}>
              {error.includes('API key') ? (
                <>⚠ {error} — go to <strong>Settings → AI Image Generation</strong></>
              ) : error}
            </p>
          )}

          {/* Preview */}
          {previewUrl && (
            <div style={{ marginTop: 16 }}>
              <img
                src={previewUrl} alt="AI generated"
                style={{ width: '100%', borderRadius: 6, display: 'block', border: '1px solid var(--border)' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => onAccept(previewUrl)}
                  style={{
                    flex: 1, padding: '8px 0', background: '#166534', color: '#fff',
                    border: 'none', borderRadius: 4, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  ✓ Use this image
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px', background: '#fff', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: 4, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ArticleEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const user = getUser();

  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [seoGenerating, setSeoGenerating] = useState(false);
  const [slugLocked, setSlugLocked] = useState(!isNew);
  const [siteTimezone, setSiteTimezone] = useState('America/New_York');
  const timezoneRef = useRef('America/New_York');

  useEffect(() => {
    api.listCategories().then(setCategories).catch(() => {});
    if (user?.role === 'admin') {
      api.listUsers().then(setAuthors).catch(() => {});
    }
    // Load settings first so timezone is available when article loads
    api.listSettings()
      .then(rows => {
        const tz = rows.find(r => r.setting_key === 'site_timezone')?.setting_value;
        if (tz) { setSiteTimezone(tz); timezoneRef.current = tz; }
      })
      .catch(() => {});
    if (!isNew) {
      api.getArticle(id)
        .then(a => {
          setForm({
            title: a.title || '',
            slug: a.slug || '',
            excerpt: a.excerpt || '',
            body: a.body || '',
            featured_image: a.featured_image || '',
            featured_image_alt: a.featured_image_alt || '',
            category_id: a.category?.id || '',
            author_id: a.author?.id || '',
            status: a.status || 'draft',
            publish_date: utcToLocalInput(a.publish_date, timezoneRef.current),
            seo_title: a.seo_title || '',
            seo_description: a.seo_description || '',
            seo_keywords: a.seo_keywords || '',
            og_image: a.og_image || '',
            schema_json: a.schema_json || '',
            source_name: a.source_name || '',
            source_url: a.source_url || '',
            extra_category_ids: a.extra_category_ids || [],
          });
        })
        .catch(() => toast('Failed to load article', 'error'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  function set(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'title' && !slugLocked) {
        next.slug = slugify(value);
      }
      // Remove from extra_category_ids if it becomes the primary
      if (field === 'category_id') {
        next.extra_category_ids = (f.extra_category_ids || []).filter(id => String(id) !== String(value));
      }
      return next;
    });
  }

  async function generateSeoMeta() {
    if (!form.title && !form.body) { toast('Add a title or body first', 'error'); return; }
    const overwrite = (form.seo_title || form.seo_description || form.seo_keywords)
      ? confirm('Existing SEO fields will be overwritten. Continue?')
      : true;
    if (!overwrite) return;
    setSeoGenerating(true);
    try {
      const res = await api.generateSeo(form.title, form.body, form.excerpt);
      setForm(f => ({
        ...f,
        seo_title:       res.seo_title       || f.seo_title,
        seo_description: res.seo_description || f.seo_description,
        seo_keywords:    res.seo_keywords    || f.seo_keywords,
      }));
      toast('SEO metadata generated');
    } catch (err) { toast(err.message, 'error'); }
    finally { setSeoGenerating(false); }
  }

  async function save(publishNow = false) {
    const effectiveStatus = publishNow ? 'published' : form.status;
    if (!form.title || !form.category_id) {
      toast('Title and category are required', 'error');
      return;
    }
    if (effectiveStatus !== 'draft' && !form.publish_date) {
      toast('Publish date is required for published and scheduled articles', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, status: effectiveStatus };
      if (isNew) {
        const res = await api.createArticle(payload);
        toast('Article created');
        navigate(`/admin/articles/${res.id}/edit`);
      } else {
        await api.updateArticle(id, payload);
        toast('Article saved');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Article' : 'Edit Article'}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link to="/admin/articles"><Btn variant="outline">← Back</Btn></Link>
            {!isNew && form.status === 'published' && form.slug && (
              <a href={`/Articles/${form.slug}/${id}/`} target="_blank" rel="noopener noreferrer">
                <Btn variant="outline">View Article ↗</Btn>
              </a>
            )}
            {!isNew && form.status === 'draft' && (
              <a href={`/Articles/${form.slug || id}/${id}/?preview=1`} target="_blank" rel="noopener noreferrer">
                <Btn variant="outline">Preview Draft ↗</Btn>
              </a>
            )}
            <Btn onClick={() => save(false)} disabled={saving} variant="outline">
              {saving ? 'Saving…' : 'Save Draft'}
            </Btn>
            <Btn onClick={() => save(true)} disabled={saving} variant="accent">
              {saving ? 'Saving…' : 'Publish'}
            </Btn>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Main column */}
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Field label="Title">
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Article title" />
            </Field>
            <Field label="Slug" hint="Auto-generated from title. Click to edit manually.">
              <Input
                value={form.slug}
                onChange={e => { setSlugLocked(true); set('slug', e.target.value); }}
                placeholder="article-slug"
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
            </Field>
            <Field label="Excerpt">
              <Textarea value={form.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="Short summary shown in article cards…" style={{ minHeight: 80 }} />
            </Field>
          </Card>

          <Card style={{ marginBottom: 16 }}>
            <Field label="Body">
              <QuillEditor value={form.body} onChange={val => set('body', val)} />
            </Field>
          </Card>

          {/* Meta & SEO — below body */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)' }}>Meta &amp; SEO</div>
              <button
                type="button"
                onClick={generateSeoMeta}
                disabled={seoGenerating}
                style={{
                  padding: '6px 14px',
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  color: '#a78bfa', border: '1px solid #4c1d95', borderRadius: 4,
                  fontSize: 12, fontWeight: 600, cursor: seoGenerating ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, opacity: seoGenerating ? 0.7 : 1,
                }}
              >
                <span style={{ fontSize: 14 }}>✦</span> {seoGenerating ? 'Generating…' : 'Generate with AI'}
              </button>
            </div>
            <Field label="SEO Title" hint="Leave blank to use article title">
              <Input value={form.seo_title} onChange={e => set('seo_title', e.target.value)} />
            </Field>
            <Field label="SEO Description">
              <Textarea value={form.seo_description} onChange={e => set('seo_description', e.target.value)} style={{ minHeight: 80 }} />
            </Field>
            <Field label="Keywords" hint="Comma-separated">
              <Input value={form.seo_keywords} onChange={e => set('seo_keywords', e.target.value)} />
            </Field>
            <Field label="OG Image URL" hint="Overrides featured image for social sharing">
              <Input value={form.og_image} onChange={e => set('og_image', e.target.value)} placeholder="https://…" />
            </Field>
            {form.og_image && (
              <img src={form.og_image} alt="OG Preview" onError={e => e.target.style.display = 'none'}
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 4, marginTop: 8 }} />
            )}
            <Field label="JSON-LD Schema" hint="Custom structured data — overrides auto-generated schema. Leave blank to use default NewsArticle schema.">
              <Textarea
                value={form.schema_json}
                onChange={e => set('schema_json', e.target.value)}
                style={{ minHeight: 160, fontFamily: 'monospace', fontSize: 12 }}
                placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "NewsArticle",\n  ...\n}'}
              />
              {form.schema_json && (() => {
                try { JSON.parse(form.schema_json); return <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>Valid JSON</div>; }
                catch (e) { return <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Invalid JSON: {e.message}</div>; }
              })()}
            </Field>
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <Field label="Status">
              <Select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </Select>
            </Field>
            <Field label={<span>Publish Date{form.status !== 'draft' && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}</span>}>
              <Input
                type="datetime-local"
                value={form.publish_date}
                onChange={e => {
                  const val = e.target.value;
                  set('publish_date', val);
                  if (val && new Date(val) > new Date() && form.status === 'draft') {
                    set('status', 'scheduled');
                  } else if (!val && form.status === 'scheduled') {
                    set('status', 'draft');
                  }
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Timezone: <strong>{siteTimezone}</strong>{form.status === 'scheduled' && ' — set a future date to schedule'}</span>
                <button
                  type="button"
                  onClick={() => {
                    const now = utcToLocalInput(new Date().toISOString(), siteTimezone);
                    set('publish_date', now);
                    if (form.status === 'scheduled') set('status', 'published');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >Use current date &amp; time</button>
              </div>
            </Field>
          </Card>

          <Card>
            <Field label="Primary Category">
              <Select value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Additional Categories" hint="Click to toggle">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                {categories.filter(c => String(c.id) !== String(form.category_id)).map(c => {
                  const selected = form.extra_category_ids.map(String).includes(String(c.id));
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const ids = form.extra_category_ids.map(String);
                        set('extra_category_ids', selected
                          ? ids.filter(id => id !== String(c.id))
                          : [...ids, String(c.id)]
                        );
                      }}
                      style={{
                        padding: '3px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
                        border: `1px solid ${selected ? '#c0392b' : '#d1d5db'}`,
                        background: selected ? '#c0392b' : '#f9fafb',
                        color: selected ? '#fff' : '#374151',
                        fontFamily: 'sans-serif',
                      }}
                    >{c.name}</button>
                  );
                })}
                {categories.filter(c => String(c.id) !== String(form.category_id)).length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No other categories</span>
                )}
              </div>
            </Field>
            {user?.role === 'admin' && authors.length > 0 && (
              <Field label="Author">
                <Select value={form.author_id || user.id} onChange={e => set('author_id', e.target.value)}>
                  {authors.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
                </Select>
              </Field>
            )}
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 16 }}>Source / Credit</div>
            <Field label="Source Name" hint="e.g. Reuters, AP, original author">
              <Input value={form.source_name} onChange={e => set('source_name', e.target.value)} placeholder="e.g. Reuters" />
            </Field>
            <Field label="Source URL" hint="Link to the original article">
              <Input value={form.source_url} onChange={e => set('source_url', e.target.value)} placeholder="https://…" />
            </Field>
          </Card>

          <Card>
            <FeaturedImageUpload
              value={form.featured_image}
              onChange={url => set('featured_image', url)}
              altValue={form.featured_image_alt}
              onAltChange={v => set('featured_image_alt', v)}
              articleTitle={form.title}
              articleBody={form.body}
              authorName={authors.find(a => String(a.id) === String(form.author_id || user?.id))?.display_name || user?.display_name || ''}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
