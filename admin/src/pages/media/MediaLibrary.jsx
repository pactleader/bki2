import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../../api.js';
import { getToken } from '../../auth.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn } from '../../components/PageHeader.jsx';

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const TYPE_ICONS = { image: '🖼', video: '🎬', document: '📄', other: '📎' };

export default function MediaLibrary() {
  const toast = useToast();
  const [files, setFiles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const [copied, setCopied]       = useState(null);
  const [filter, setFilter]       = useState('all');
  const [search, setSearch]       = useState('');
  const [dragging, setDragging]   = useState(false);
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api.listMedia()
      .then(setFiles)
      .catch(() => toast('Failed to load media', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function uploadFiles(fileList) {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      const data = new FormData();
      Array.from(fileList).forEach(f => data.append('files', f));
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      toast(`${json.length} file${json.length > 1 ? 's' : ''} uploaded`);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(file) {
    try {
      await api.deleteMedia(file.filename);
      setFiles(f => f.filter(x => x.filename !== file.filename));
      if (selected?.filename === file.filename) setSelected(null);
      toast('Deleted');
    } catch (err) { toast(err.message, 'error'); }
    finally { setDeleting(null); }
  }

  function copyUrl(file) {
    const url = `${window.location.origin}${file.url}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(file.filename);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // Drag-and-drop
  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave(e) { if (!dropRef.current?.contains(e.relatedTarget)) setDragging(false); }
  function onDrop(e) { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); }

  const visible = files.filter(f => {
    if (filter !== 'all' && f.type !== filter) return false;
    if (search && !f.filename.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tabStyle = (t) => ({
    padding: '6px 14px', border: 'none', borderRadius: 4, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
    background: filter === t ? 'var(--primary)' : 'transparent',
    color: filter === t ? '#fff' : 'var(--text-muted)',
  });

  return (
    <div>
      <PageHeader
        title="Media Library"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx"
              style={{ display: 'none' }} onChange={e => uploadFiles(e.target.files)} />
            <Btn variant="accent" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : '↑ Upload Files'}
            </Btn>
          </div>
        }
      />

      {/* Drop zone */}
      <div ref={dropRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8, padding: '24px', textAlign: 'center', marginBottom: 20,
          background: dragging ? 'rgba(192,57,43,0.04)' : 'var(--surface)',
          cursor: 'pointer', transition: 'all 150ms',
        }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>☁</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {uploading ? 'Uploading…' : 'Drag & drop files here, or click to browse'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Images, PDFs, videos — up to 400 MB each
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 6, padding: 3, border: '1px solid var(--border)' }}>
          {['all', 'image', 'video', 'document', 'other'].map(t => (
            <button key={t} style={tabStyle(t)} onClick={() => setFilter(t)}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
            </button>
          ))}
        </div>
        <input
          placeholder="Search files…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 200px', padding: '7px 12px', border: '1px solid var(--border)',
            borderRadius: 4, fontFamily: 'inherit', fontSize: 13, background: '#fff',
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {visible.length} file{visible.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : visible.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No files found.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {visible.map(file => (
            <div key={file.filename}
              onClick={() => setSelected(selected?.filename === file.filename ? null : file)}
              style={{
                border: `2px solid ${selected?.filename === file.filename ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                background: '#fff', transition: 'border-color 120ms',
                boxShadow: selected?.filename === file.filename ? '0 0 0 2px rgba(192,57,43,0.15)' : 'none',
              }}
            >
              {/* Thumbnail */}
              <div style={{ height: 110, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {file.type === 'image' ? (
                  <img src={file.url} alt={file.filename}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                ) : null}
                <div style={{ display: file.type === 'image' ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 32 }}>{TYPE_ICONS[file.type] || '📎'}</span>
                </div>
              </div>
              {/* Info */}
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.filename}>
                  {file.filename}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmtSize(file.size)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 300,
          background: '#fff', borderLeft: '1px solid var(--border)',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.08)', zIndex: 500,
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>File Details</span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>×</button>
          </div>

          {/* Preview */}
          <div style={{ background: '#f5f5f5', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
            {selected.type === 'image' ? (
              <img src={selected.url} alt={selected.filename} style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 4 }} />
            ) : (
              <span style={{ fontSize: 56 }}>{TYPE_ICONS[selected.type]}</span>
            )}
          </div>

          <div style={{ padding: 20, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, wordBreak: 'break-all', marginBottom: 12 }}>{selected.filename}</div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              {[
                ['Type', selected.type],
                ['Size', fmtSize(selected.size)],
                ['Uploaded', fmtDate(selected.uploaded_at)],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: 'var(--text-muted)', paddingBottom: 6, width: 70 }}>{k}</td>
                  <td style={{ paddingBottom: 6 }}>{v}</td>
                </tr>
              ))}
            </table>

            {/* URL box */}
            <div style={{ marginTop: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>File URL</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input readOnly value={`${window.location.origin}${selected.url}`}
                  style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11, background: 'var(--surface)', fontFamily: 'monospace', color: 'var(--text-muted)', minWidth: 0 }}
                  onFocus={e => e.target.select()}
                />
                <button onClick={() => copyUrl(selected)}
                  style={{ padding: '7px 12px', background: copied === selected.filename ? '#16a34a' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 200ms' }}>
                  {copied === selected.filename ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={selected.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', textAlign: 'center', padding: '9px 0', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>
                ↗ Open in new tab
              </a>
              <button onClick={() => setDeleting(selected)}
                style={{ padding: '9px 0', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, fontSize: 12, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑 Delete file
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title="Delete File"
          message={`Delete "${deleting.filename}"? This cannot be undone.`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
