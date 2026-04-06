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

const EMPTY = {
  title: '', slug: '', excerpt: '', body: '', featured_image: '',
  category_id: '', status: 'draft', publish_date: '',
  seo_title: '', seo_description: '', seo_keywords: '', og_image: '',
};

function FeaturedImageUpload({ value, onChange }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { getToken } = await import('../../auth.js');
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <Field label="Featured Image">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Upload a file or paste a URL…"
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
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        {error && <p style={{ color: '#c0392b', fontSize: 12, marginTop: 4 }}>{error}</p>}
      </Field>
      {value && (
        <div style={{ position: 'relative', marginTop: 8 }}>
          <img
            src={value} alt="Preview"
            onError={e => e.target.style.display = 'none'}
            style={{ width: '100%', borderRadius: 4, maxHeight: 180, objectFit: 'cover', display: 'block' }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.55)',
              color: '#fff', border: 'none', borderRadius: 3, padding: '2px 8px',
              fontSize: 12, cursor: 'pointer',
            }}
          >Remove</button>
        </div>
      )}
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
  const [slugLocked, setSlugLocked] = useState(!isNew);
  const [tab, setTab] = useState('content');

  useEffect(() => {
    api.listCategories().then(setCategories).catch(() => {});
    if (user?.role === 'admin') {
      api.listUsers().then(setAuthors).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isNew) {
      api.getArticle(id)
        .then(a => {
          setForm({
            title: a.title || '',
            slug: a.slug || '',
            excerpt: a.excerpt || '',
            body: a.body || '',
            featured_image: a.featured_image || '',
            category_id: a.category?.id || '',
            author_id: a.author?.id || '',
            status: a.status || 'draft',
            publish_date: a.publish_date ? a.publish_date.slice(0, 16) : '',
            seo_title: a.seo_title || '',
            seo_description: a.seo_description || '',
            seo_keywords: a.seo_keywords || '',
            og_image: a.og_image || '',
          });
        })
        .catch(() => toast('Failed to load article', 'error'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  function set(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value };
      // Auto-generate slug from title only if not locked
      if (field === 'title' && !slugLocked) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  async function save(publishNow = false) {
    if (!form.title || !form.category_id) {
      toast('Title and category are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, status: publishNow ? 'published' : form.status };
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

  const tabStyle = (t) => ({
    padding: '8px 16px', border: 'none', background: 'none',
    fontWeight: tab === t ? 600 : 400, cursor: 'pointer', fontSize: 13,
    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
    color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
  });

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Article' : 'Edit Article'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/admin/articles"><Btn variant="outline">← Back</Btn></Link>
            <Btn onClick={() => save(false)} disabled={saving} variant="outline">
              {saving ? 'Saving…' : 'Save Draft'}
            </Btn>
            <Btn onClick={() => save(true)} disabled={saving} variant="accent">
              {saving ? 'Saving…' : 'Publish'}
            </Btn>
          </div>
        }
      />

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 20, display: 'flex' }}>
        <button style={tabStyle('content')} onClick={() => setTab('content')}>Content</button>
        <button style={tabStyle('meta')} onClick={() => setTab('meta')}>Meta & SEO</button>
      </div>

      {tab === 'content' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
          {/* Main */}
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

            <Card>
              <Field label="Body">
                <QuillEditor value={form.body} onChange={val => set('body', val)} />
              </Field>
            </Card>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <Field label="Status">
                <Select value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </Select>
              </Field>
              <Field label="Publish Date" hint="Leave blank to publish immediately">
                <Input type="datetime-local" value={form.publish_date} onChange={e => set('publish_date', e.target.value)} />
              </Field>
            </Card>

            <Card>
              <Field label="Category">
                <Select value={form.category_id} onChange={e => set('category_id', e.target.value)}>
                  <option value="">Select category…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
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
              <FeaturedImageUpload
                value={form.featured_image}
                onChange={url => set('featured_image', url)}
              />
            </Card>
          </div>
        </div>
      )}

      {tab === 'meta' && (
        <Card style={{ maxWidth: 700 }}>
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
        </Card>
      )}
    </div>
  );
}
