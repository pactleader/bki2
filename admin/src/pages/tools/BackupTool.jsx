import { useEffect, useState } from 'react';
import { getToken } from '../../auth.js';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Table, TR, TD } from '../../components/PageHeader.jsx';

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function BackupTool() {
  const toast = useToast();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState('');  // 'db' | 'full' | ''
  const [downloading, setDownloading] = useState('');
  const [deleting, setDeleting] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const list = await api.listBackups();
      setBackups(list);
    } catch (err) {
      toast('Failed to load backups: ' + err.message, 'error');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function generate(kind) {
    setGenerating(kind);
    try {
      const result = kind === 'db' ? await api.createBackupDb() : await api.createBackupFull();
      toast(`Backup created: ${result.name}`);
      load();
    } catch (err) {
      toast('Backup failed: ' + err.message, 'error');
    } finally { setGenerating(''); }
  }

  async function download(name) {
    setDownloading(name);
    try {
      const res = await fetch(api.backupDownloadUrl(name), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast('Download failed: ' + err.message, 'error');
    } finally { setDownloading(''); }
  }

  async function handleDelete(backup) {
    try {
      await api.deleteBackup(backup.name);
      toast('Backup deleted');
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally { setDeleting(null); }
  }

  return (
    <div>
      <PageHeader title="Backup" />

      <Card style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Create a new backup</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          Download a snapshot of the site. Backups are stored on the server (last 5 are kept) and can be downloaded anytime.
          Database-only is fast and small; a full backup also includes all uploaded images and media.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Btn variant="outline" onClick={() => generate('db')} disabled={generating !== ''}>
            {generating === 'db' ? 'Generating…' : '📄 Database only'}
          </Btn>
          <Btn variant="accent" onClick={() => generate('full')} disabled={generating !== ''}>
            {generating === 'full' ? 'Generating…' : '📦 Full backup (DB + uploads)'}
          </Btn>
        </div>
        {generating === 'full' && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, padding: '10px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 4 }}>
            Zipping the uploads folder — this can take 30 seconds to a few minutes depending on how much media you have. Don't navigate away.
          </div>
        )}
      </Card>

      <Card style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600 }}>
          Stored backups
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : backups.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No backups yet. Click a button above to create one.</div>
        ) : (
          <Table headers={['Filename', 'Type', 'Size', 'Created', '']}>
            {backups.map(b => {
              const isFull = b.name.includes('full');
              return (
                <TR key={b.name}>
                  <TD style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.name}</TD>
                  <TD>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: isFull ? '#dbeafe' : '#f3f4f6',
                      color: isFull ? '#1e40af' : '#374151',
                    }}>{isFull ? 'Full' : 'Database'}</span>
                  </TD>
                  <TD style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtSize(b.size)}</TD>
                  <TD style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(b.created_at)}</TD>
                  <TD>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => download(b.name)}
                        disabled={downloading === b.name}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}
                      >{downloading === b.name ? 'Downloading…' : '↓ Download'}</button>
                      <button
                        onClick={() => setDeleting(b)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}
                      >Delete</button>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </Table>
        )}
      </Card>

      <Card style={{ marginTop: 24, background: '#f9fafb' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>How to restore</div>
        <ul style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, paddingLeft: 20, margin: 0 }}>
          <li><strong>Database:</strong> <code style={{ background: '#e5e7eb', padding: '1px 4px', borderRadius: 3 }}>mysql -u user -p dbname &lt; database.sql</code></li>
          <li><strong>Uploads:</strong> extract and copy the <code style={{ background: '#e5e7eb', padding: '1px 4px', borderRadius: 3 }}>uploads/</code> folder to <code style={{ background: '#e5e7eb', padding: '1px 4px', borderRadius: 3 }}>/public/uploads/</code> on the server</li>
          <li>Source code is on GitHub — pull it and run <code style={{ background: '#e5e7eb', padding: '1px 4px', borderRadius: 3 }}>npm install && npm run build</code></li>
        </ul>
      </Card>

      {deleting && (
        <ConfirmModal
          title="Delete Backup"
          message={`Delete "${deleting.name}"? This cannot be undone.`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
