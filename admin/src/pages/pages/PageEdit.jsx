import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../../api.js';
import QuillEditor from '../../components/QuillEditor.jsx';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Input, Textarea } from '../../components/PageHeader.jsx';

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/--+/g, '-');
}

const EMPTY = { title: '', slug: '', body: '', meta_title: '', meta_description: '', is_published: false };

export default function PageEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id || id === 'new';

  const [form, setForm] = useState(EMPTY);
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      api.getPage(id).then(p => {
        setForm({
          title: p.title || '',
          slug: p.slug || '',
          body: p.body || '',
          meta_title: p.meta_title || '',
          meta_description: p.meta_description || '',
          is_published: !!p.is_published,
        });
        setSlugManual(true);
      }).catch(() => toast('Failed to load page', 'error'));
    }
  }, [id]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function handleTitle(v) {
    set('title', v);
    if (!slugManual) set('slug', slugify(v));
  }

  async function save(publish) {
    if (!form.title) { toast('Title is required', 'error'); return; }
    if (!form.slug)  { toast('Slug is required', 'error'); return; }
    setSaving(true);
    const payload = { ...form, is_published: publish ?? form.is_published };
    try {
      if (isNew) {
        const { id: newId } = await api.createPage(payload);
        toast('Page created');
        navigate(`/admin/pages/${newId}/edit`, { replace: true });
      } else {
        await api.updatePage(id, payload);
        toast('Saved');
        setForm(f => ({ ...f, is_published: payload.is_published }));
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title={isNew ? 'New Page' : 'Edit Page'}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="outline" onClick={() => navigate('/admin/pages')}>← Pages</Btn>
            {!form.is_published && (
              <Btn variant="outline" onClick={() => save(false)} disabled={saving}>Save Draft</Btn>
            )}
            <Btn variant="accent" onClick={() => save(true)} disabled={saving}>
              {saving ? 'Saving…' : form.is_published ? 'Save' : 'Publish'}
            </Btn>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Main content */}
        <div>
          <Card>
            <Field label="Title">
              <Input
                value={form.title}
                onChange={e => handleTitle(e.target.value)}
                placeholder="Privacy Policy"
                style={{ fontSize: 18, fontWeight: 600 }}
              />
            </Field>

            <Field label="Slug" hint={`Public URL: /p/${form.slug || 'your-slug'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <span style={{ padding: '8px 10px', background: '#f3f4f6', border: '1px solid var(--border)', borderRight: 'none', borderRadius: '6px 0 0 6px', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  /p/
                </span>
                <input
                  value={form.slug}
                  onChange={e => { setSlugManual(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); }}
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: '0 6px 6px 0', fontSize: 14, fontFamily: 'monospace', outline: 'none' }}
                  placeholder="privacy-policy"
                />
              </div>
            </Field>

            <Field label="Body">
              <QuillEditor value={form.body} onChange={v => set('body', v)} />
            </Field>
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Status</div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 6,
              background: form.is_published ? '#dcfce7' : '#f3f4f6',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: form.is_published ? '#166534' : '#6b7280' }}>
                {form.is_published ? 'Published' : 'Draft'}
              </span>
              {form.is_published && !isNew && (
                <button
                  onClick={() => save(false)}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Unpublish
                </button>
              )}
            </div>
            {form.is_published && form.slug && (
              <a
                href={`/p/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', marginTop: 10, fontSize: 12, color: 'var(--accent, #c0392b)' }}
              >
                ↗ View live page
              </a>
            )}
          </Card>

          <Card>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14 }}>SEO</div>
            <Field label="Meta title" hint="Defaults to page title if blank">
              <Input
                value={form.meta_title}
                onChange={e => set('meta_title', e.target.value)}
                placeholder={form.title}
              />
            </Field>
            <Field label="Meta description">
              <Textarea
                value={form.meta_description}
                onChange={e => set('meta_description', e.target.value)}
                placeholder="Brief description for search engines…"
                style={{ minHeight: 80 }}
              />
            </Field>
          </Card>
        </div>
      </div>
    </div>
  );
}
