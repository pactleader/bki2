import { useRef, useState } from 'react';
import { importPreview, importRun } from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card } from '../../components/PageHeader.jsx';

const STEP = { IDLE: 'idle', PREVIEWING: 'previewing', PREVIEW: 'preview', RUNNING: 'running', DONE: 'done' };

export default function ImportTool() {
  const { addToast } = useToast();
  const fileRef      = useRef(null);

  const [step,      setStep]      = useState(STEP.IDLE);
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [catOverride, setCatOverride] = useState({}); // oldCatId → newCategoryId (int)
  const [result,    setResult]    = useState(null);

  // ── File pick ────────────────────────────────────────────────
  function onFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.sql')) {
      addToast('Please select a .sql file', 'error');
      return;
    }
    setFile(f);
    setStep(STEP.IDLE);
    setPreview(null);
    setResult(null);
  }

  // ── Step 1: Preview ──────────────────────────────────────────
  async function handlePreview() {
    if (!file) return;
    setStep(STEP.PREVIEWING);
    try {
      const data = await importPreview(file);
      setPreview(data);
      // Init category overrides to whatever the server resolved
      const init = {};
      for (const [oldId, info] of Object.entries(data.category_map)) {
        if (info.newId) init[oldId] = info.newId;
      }
      setCatOverride(init);
      setStep(STEP.PREVIEW);
    } catch (err) {
      addToast(err.message, 'error');
      setStep(STEP.IDLE);
    }
  }

  // ── Step 2: Run ──────────────────────────────────────────────
  async function handleRun() {
    if (!preview) return;
    setStep(STEP.RUNNING);
    try {
      // Build override map with integer values
      const overrides = {};
      for (const [k, v] of Object.entries(catOverride)) {
        if (v) overrides[k] = parseInt(v);
      }
      const res = await importRun(preview._posts, overrides);
      setResult(res);
      setStep(STEP.DONE);
      addToast(`Import complete — ${res.imported} articles imported`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
      setStep(STEP.PREVIEW);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setStep(STEP.IDLE);
    if (fileRef.current) fileRef.current.value = '';
  }

  const busy = step === STEP.PREVIEWING || step === STEP.RUNNING;

  return (
    <>
      <PageHeader title="Import Old Blog Posts" />

      {/* Info banner */}
      <Card style={{ marginBottom: 24, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
          Upload the <strong>.sql</strong> dump from the old site. The tool will parse{' '}
          <code>blog_post</code> records, map categories, and insert articles using the{' '}
          <strong>original numeric IDs</strong> so all existing permalinks (
          <code>/Articles/…/&lt;id&gt;/</code>) continue to work.
        </p>
      </Card>

      {/* Step 1 — File upload */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Step 1 — Select SQL file</h3>
        <input
          ref={fileRef}
          type="file"
          accept=".sql"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Btn variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            Choose .sql file
          </Btn>
          {file && (
            <span style={{ fontSize: 13, color: '#374151' }}>
              {file.name} <span style={{ color: '#6b7280' }}>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </span>
          )}
          {file && step === STEP.IDLE && (
            <Btn variant="primary" onClick={handlePreview} disabled={busy}>
              Analyse File →
            </Btn>
          )}
          {step === STEP.PREVIEWING && <Spinner label="Analysing…" />}
        </div>
      </Card>

      {/* Step 2 — Preview */}
      {(step === STEP.PREVIEW || step === STEP.RUNNING || step === STEP.DONE) && preview && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Step 2 — Review &amp; configure</h3>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Stat label="Total in file"   value={preview.total_in_file}  color="#374151" />
            <Stat label="Published posts" value={preview.published}       color="#374151" />
            <Stat label="Will import"     value={preview.importable}      color="#166534" />
            <Stat label="Already exist"   value={preview.skipped_dupe}    color="#92400e" />
            <Stat label="No category map" value={preview.skipped_no_cat}  color="#991b1b" />
            <Stat label="Draft / skipped" value={preview.skipped_draft}   color="#6b7280" />
          </div>

          {/* Category mapping */}
          <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>Category mapping</h4>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
            Map each old category to one of your new categories. Posts with an unmapped category will be skipped.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={TH}>Old ID</th>
                <th style={TH}>Old Name</th>
                <th style={TH}>Maps to</th>
                <th style={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(preview.category_map).map(([oldId, info]) => (
                <tr key={oldId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={TD}>{oldId}</td>
                  <td style={TD}>{info.oldName}</td>
                  <td style={TD}>
                    <select
                      value={catOverride[oldId] || ''}
                      onChange={e => setCatOverride(prev => ({ ...prev, [oldId]: e.target.value }))}
                      disabled={step === STEP.DONE}
                      style={{
                        fontSize: 12, padding: '4px 8px', border: '1px solid #d1d5db',
                        borderRadius: 4, background: '#fff', width: '100%',
                      }}
                    >
                      <option value="">— skip posts in this category —</option>
                      {preview.new_categories.map(nc => (
                        <option key={nc.id} value={nc.id}>{nc.name}</option>
                      ))}
                    </select>
                  </td>
                  <td style={TD}>
                    {catOverride[oldId]
                      ? <span style={{ color: '#166534', fontWeight: 600 }}>✓ mapped</span>
                      : <span style={{ color: '#991b1b' }}>✗ unmapped</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Sample posts */}
          {preview.sample.length > 0 && (
            <>
              <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>
                Sample posts to import (first 5)
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={TH}>ID</th>
                    <th style={TH}>Title</th>
                    <th style={TH}>Date</th>
                    <th style={TH}>Cat ID</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map(p => (
                    <tr key={p.uid} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={TD}>{p.uid}</td>
                      <td style={TD}>{p.title}</td>
                      <td style={TD}>{p.date}</td>
                      <td style={TD}>{p.cat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {preview.importable === 0 && step !== STEP.DONE && (
            <p style={{ color: '#991b1b', fontSize: 13, margin: '0 0 16px' }}>
              No importable posts found. Either all posts already exist in the database or no categories are mapped.
            </p>
          )}

          {step !== STEP.DONE && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Btn
                variant="primary"
                onClick={handleRun}
                disabled={busy || preview.importable === 0}
              >
                {step === STEP.RUNNING ? 'Importing…' : `Import ${preview.importable} posts →`}
              </Btn>
              {step === STEP.RUNNING && <Spinner label="Importing…" />}
              <Btn variant="outline" onClick={reset} disabled={busy}>
                Start over
              </Btn>
            </div>
          )}
        </Card>
      )}

      {/* Step 3 — Result */}
      {step === STEP.DONE && result && (
        <Card style={{ background: result.imported > 0 ? '#f0fdf4' : '#fff7ed', border: `1px solid ${result.imported > 0 ? '#bbf7d0' : '#fed7aa'}` }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>
            {result.imported > 0 ? '✓ Import complete' : 'Import finished with no new posts'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '8px 32px', fontSize: 13, marginBottom: 16 }}>
            <span style={{ color: '#166534', fontWeight: 600 }}>Imported</span>
            <span style={{ color: '#92400e', fontWeight: 600 }}>Skipped</span>
            <span style={{ color: result.errors?.length ? '#991b1b' : '#6b7280', fontWeight: 600 }}>Errors</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#166534' }}>{result.imported}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#92400e' }}>{result.skipped}</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: result.errors?.length ? '#991b1b' : '#6b7280' }}>
              {result.errors?.length || 0}
            </span>
          </div>

          {result.errors?.length > 0 && (
            <>
              <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>Error details</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#991b1b' }}>
                {result.errors.map((e, i) => (
                  <li key={i}><strong>#{e.uid}</strong> {e.title} — {e.error}</li>
                ))}
              </ul>
            </>
          )}

          <div style={{ marginTop: 20 }}>
            <Btn variant="outline" onClick={reset}>Import another file</Btn>
          </div>
        </Card>
      )}
    </>
  );
}

// ── Small helpers ─────────────────────────────────────────────

function Stat({ label, value, color }) {
  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '12px 14px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        display: 'inline-block', width: 14, height: 14, border: '2px solid #d1d5db',
        borderTopColor: '#6b7280', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      {label}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

const TH = { textAlign: 'left', padding: '6px 10px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em' };
const TD = { padding: '7px 10px', verticalAlign: 'middle' };
