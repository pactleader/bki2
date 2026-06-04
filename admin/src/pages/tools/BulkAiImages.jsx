import { useState, useEffect, useRef } from 'react';
import * as api from '../../api.js';
import { getToken } from '../../auth.js';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Select } from '../../components/PageHeader.jsx';

const DEFAULT_PROMPT =
  'A high-quality newspaper headline image for a news article titled: "{title}". Professional photojournalism style, no text overlay.';

export default function BulkAiImages() {
  const toast = useToast();
  const [categories, setCategories]   = useState([]);
  const [categoryId, setCategoryId]   = useState('');
  const [count, setCount]             = useState(10);
  const [provider, setProvider]       = useState('openai');
  const [prompt, setPrompt]           = useState(DEFAULT_PROMPT);
  const [skipExisting, setSkipExisting] = useState(true);

  const [running, setRunning]   = useState(false);
  const [jobs, setJobs]         = useState([]); // [{id, title, status, url, error}]
  const abortRef = useRef(false);

  useEffect(() => {
    api.listCategories().then(setCategories).catch(() => {});
  }, []);

  function updateJob(id, patch) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
  }

  async function start() {
    if (running) return;
    abortRef.current = false;
    setRunning(true);
    setJobs([]);

    try {
      // Fetch articles
      const params = { limit: count, page: 1, status: 'published' };
      if (categoryId) params.category_id = categoryId;
      const res = await api.listArticles(params);
      let articles = res.data || [];

      if (skipExisting) articles = articles.filter(a => !a.featured_image);

      if (articles.length === 0) {
        toast('No articles found matching the criteria', 'error');
        setRunning(false);
        return;
      }

      // Init job list
      setJobs(articles.map(a => ({ id: a.id, title: a.title, status: 'pending', url: null, error: null })));

      for (const article of articles) {
        if (abortRef.current) {
          updateJob(article.id, { status: 'skipped' });
          continue;
        }

        updateJob(article.id, { status: 'generating' });

        const articlePrompt = prompt.replace('{title}', article.title);

        try {
          const result = await api.generateImage(articlePrompt, provider, {
            title: article.title,
            description: article.title,
          });

          // Fetch full article (need body) then save with new image
          const full = await api.getArticle(article.id);
          await api.updateArticle(article.id, {
            title:           full.title,
            slug:            full.slug,
            excerpt:         full.excerpt        || '',
            body:            full.body           || '',
            featured_image:  result.url,
            category_id:     full.category?.id  || full.category_id,
            status:          full.status,
            publish_date:    full.publish_date   || '',
            seo_title:       full.seo_title      || '',
            seo_description: full.seo_description || '',
            seo_keywords:    full.seo_keywords   || '',
            og_image:        full.og_image       || '',
          });

          updateJob(article.id, { status: 'done', url: result.url });
        } catch (err) {
          updateJob(article.id, { status: 'error', error: err.message });
        }
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRunning(false);
    }
  }

  function stop() {
    abortRef.current = true;
  }

  const done    = jobs.filter(j => j.status === 'done').length;
  const errors  = jobs.filter(j => j.status === 'error').length;
  const total   = jobs.length;
  const progress = total > 0 ? Math.round(((done + errors) / total) * 100) : 0;

  return (
    <div>
      <PageHeader title="Generate Bulk AI Images" />

      <Card style={{ maxWidth: 680, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Field label="Category" hint="Leave blank to use all categories">
            <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>

          <Field label="Number of articles" hint="Most recent articles will be used">
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff' }}
            >
              {[5, 10, 20, 30, 50, 100, 150, 200].map(n => <option key={n} value={n}>{n} articles</option>)}
            </select>
          </Field>

          <Field label="AI Model">
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ value: 'openai', label: 'OpenAI DALL·E 3' }, { value: 'google', label: 'Google Imagen 4' }].map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setProvider(p.value)}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, borderRadius: 4,
                    cursor: 'pointer', fontFamily: 'inherit',
                    border: provider === p.value ? '2px solid #7c3aed' : '1px solid var(--border)',
                    background: provider === p.value ? '#f5f3ff' : '#fff',
                    color: provider === p.value ? '#7c3aed' : 'var(--text-muted)',
                  }}
                >{p.label}</button>
              ))}
            </div>
          </Field>

          <Field label="Prompt template" hint='Use {title} as a placeholder for the article title'>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)',
                borderRadius: 4, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={skipExisting}
              onChange={e => setSkipExisting(e.target.checked)}
              style={{ width: 15, height: 15 }}
            />
            Skip articles that already have a featured image
          </label>

          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="accent" onClick={start} disabled={running}>
              {running ? 'Generating…' : '✦ Start Generating'}
            </Btn>
            {running && (
              <Btn variant="outline" onClick={stop}>Stop</Btn>
            )}
          </div>
        </div>
      </Card>

      {/* Progress */}
      {jobs.length > 0 && (
        <Card style={{ maxWidth: 680 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {running ? `Generating… ${done + errors} / ${total}` : `Done — ${done} succeeded, ${errors} failed`}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{progress}%</span>
            </div>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: errors > 0 && !running ? '#c0392b' : '#16a34a',
                width: `${progress}%`,
                transition: 'width 300ms ease',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
            {jobs.map(job => (
              <div key={job.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 6,
                background: job.status === 'done' ? '#f0fdf4' : job.status === 'error' ? '#fef2f2' : job.status === 'generating' ? '#faf5ff' : '#f9fafb',
                border: `1px solid ${job.status === 'done' ? '#bbf7d0' : job.status === 'error' ? '#fecaca' : job.status === 'generating' ? '#e9d5ff' : '#e5e7eb'}`,
              }}>
                {/* Status icon */}
                <div style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {job.status === 'pending'    && <span style={{ color: '#9ca3af', fontSize: 14 }}>○</span>}
                  {job.status === 'generating' && (
                    <span style={{
                      display: 'inline-block', width: 14, height: 14,
                      border: '2px solid #c4b5fd', borderTopColor: '#7c3aed',
                      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                    }} />
                  )}
                  {job.status === 'done'    && <span style={{ color: '#16a34a', fontSize: 16 }}>✓</span>}
                  {job.status === 'error'   && <span style={{ color: '#c0392b', fontSize: 16 }}>✗</span>}
                  {job.status === 'skipped' && <span style={{ color: '#9ca3af', fontSize: 14 }}>–</span>}
                </div>

                {/* Thumbnail */}
                {job.url && (
                  <img src={job.url} alt="" style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                )}

                {/* Title + error */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    [{job.id}] {job.title}
                  </div>
                  {job.error && <div style={{ fontSize: 11, color: '#c0392b', marginTop: 2 }}>{job.error}</div>}
                </div>

                <span style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0,
                  color: job.status === 'done' ? '#16a34a' : job.status === 'error' ? '#c0392b' : job.status === 'generating' ? '#7c3aed' : '#9ca3af',
                }}>{job.status}</span>
              </div>
            ))}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Card>
      )}
    </div>
  );
}
