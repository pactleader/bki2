const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const { spawn } = require('child_process');
const archiver  = require('archiver');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken, requireAdmin);

const UPLOADS_DIR  = path.join(__dirname, '../../public/uploads');
const BACKUPS_DIR  = path.join(__dirname, '../../backups');
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

const MAX_STORED_BACKUPS = 5;

function timestamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Stream a mysqldump child process to a writable
function spawnMysqldump() {
  const args = [
    '-h', process.env.DB_HOST,
    '-P', process.env.DB_PORT || '3306',
    '-u', process.env.DB_USER,
    `-p${process.env.DB_PASSWORD || ''}`,
    '--single-transaction',
    '--quick',
    '--no-tablespaces',
    '--default-character-set=utf8mb4',
    process.env.DB_NAME,
  ];
  return spawn('mysqldump', args);
}

// Keep only the most recent N backups
function pruneOldBackups() {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => /^backup-.*\.(zip|sql)$/.test(f))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.mtime - a.mtime);
    files.slice(MAX_STORED_BACKUPS).forEach(f => {
      try { fs.unlinkSync(path.join(BACKUPS_DIR, f.name)); } catch {}
    });
  } catch (e) { console.warn('backup prune skipped:', e.message); }
}

// In-progress job tracking (single-instance; survives only while server is up)
const inProgress = new Map(); // name -> { startedAt, kind, error? }

// GET /api/admin/backup/list  — list stored backups + any in-progress jobs
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => /^backup-.*\.(zip|sql)$/.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUPS_DIR, f));
        return { name: f, size: stat.size, created_at: stat.mtime.toISOString(), status: 'ready' };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    // Prepend any in-progress jobs
    const jobs = Array.from(inProgress.entries()).map(([name, job]) => ({
      name, size: 0, created_at: job.startedAt, status: job.error ? 'failed' : 'in_progress',
      kind: job.kind, error: job.error || null,
    }));
    res.json([...jobs, ...files]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/backup/download/:name  — download a previously generated backup
router.get('/download/:name', (req, res) => {
  const name = req.params.name;
  if (!/^backup-[\w.-]+\.(zip|sql)$/.test(name)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const file = path.join(BACKUPS_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Backup not found' });
  res.download(file, name);
});

// DELETE /api/admin/backup/:name  — delete a stored backup
router.delete('/:name', (req, res) => {
  const name = req.params.name;
  if (!/^backup-[\w.-]+\.(zip|sql)$/.test(name)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const file = path.join(BACKUPS_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Backup not found' });
  try {
    fs.unlinkSync(file);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/backup/database  — generate DB-only .sql backup
router.post('/database', (req, res) => {
  const name = `backup-db-${timestamp()}.sql`;
  const outPath = path.join(BACKUPS_DIR, name);
  const out = fs.createWriteStream(outPath);
  const dump = spawnMysqldump();

  let stderr = '';
  dump.stderr.on('data', chunk => { stderr += chunk.toString(); });

  dump.stdout.pipe(out);

  dump.on('error', err => {
    try { out.destroy(); fs.unlinkSync(outPath); } catch {}
    res.status(500).json({ error: `mysqldump failed to start: ${err.message}. Ensure mysqldump is on PATH.` });
  });

  dump.on('close', code => {
    out.end();
    if (code !== 0) {
      try { fs.unlinkSync(outPath); } catch {}
      // Filter out the "password on command line" warning which mysqldump emits even on success
      const relevantErr = stderr.replace(/mysqldump: \[Warning\].*password.*insecure.*\n?/gi, '').trim();
      return res.status(500).json({ error: relevantErr || `mysqldump exited with code ${code}` });
    }
    pruneOldBackups();
    const stat = fs.statSync(outPath);
    res.json({ name, size: stat.size, created_at: stat.mtime.toISOString() });
  });
});

// POST /api/admin/backup/full  — kick off a full backup in the background
// Returns immediately with { name, status: 'in_progress' }. UI polls /list to track progress.
router.post('/full', (req, res) => {
  // Only one full backup at a time
  const alreadyRunning = Array.from(inProgress.values()).some(j => j.kind === 'full');
  if (alreadyRunning) {
    return res.status(409).json({ error: 'A full backup is already in progress. Wait for it to finish.' });
  }

  const name = `backup-full-${timestamp()}.zip`;
  const outPath = path.join(BACKUPS_DIR, name);
  const tmpSqlPath = path.join(BACKUPS_DIR, `.tmp-${Date.now()}.sql`);
  const startedAt = new Date().toISOString();

  inProgress.set(name, { startedAt, kind: 'full' });

  // Respond immediately so Nginx doesn't time out
  res.json({ name, status: 'in_progress', started_at: startedAt });

  // Background work — fire-and-forget
  (async () => {
    function cleanupTmp() { try { fs.unlinkSync(tmpSqlPath); } catch {} }

    try {
      // Phase 1: dump DB to temp file
      await new Promise((resolve, reject) => {
        const tmp = fs.createWriteStream(tmpSqlPath);
        const dump = spawnMysqldump();
        let stderr = '';
        dump.stderr.on('data', c => { stderr += c.toString(); });
        dump.on('error', err => reject(new Error(`mysqldump failed to start: ${err.message}`)));
        dump.stdout.pipe(tmp);
        tmp.on('error', reject);
        dump.on('close', code => {
          tmp.end();
          if (code !== 0) {
            const relevant = stderr.replace(/mysqldump: \[Warning\].*password.*insecure.*\n?/gi, '').trim();
            return reject(new Error(relevant || `mysqldump exited with code ${code}`));
          }
          tmp.on('finish', resolve);
          tmp.on('close',  resolve);
        });
      });

      // Phase 2: build zip
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(outPath);
        const archive = archiver('zip', { zlib: { level: 6 } });
        out.on('close', resolve);
        out.on('error', reject);
        archive.on('warning', err => {
          if (err.code === 'ENOENT' || err.code === 'EACCES' || err.code === 'EPERM') {
            console.warn('[backup/full] archive warning (skipped):', err.message);
          } else {
            reject(err);
          }
        });
        archive.on('error', reject);
        archive.pipe(out);
        archive.file(tmpSqlPath, { name: 'database.sql' });
        if (fs.existsSync(UPLOADS_DIR)) archive.directory(UPLOADS_DIR, 'uploads');
        archive.append(
          `BKI Site Backup\n` +
          `Generated: ${new Date().toISOString()}\n` +
          `Database: ${process.env.DB_NAME}\n\n` +
          `Contents:\n` +
          `- database.sql — mysqldump output (import: mysql -u user -p dbname < database.sql)\n` +
          `- uploads/     — contents of /public/uploads (all images and media)\n`,
          { name: 'README.txt' }
        );
        archive.finalize().catch(reject);
      });

      cleanupTmp();
      pruneOldBackups();
      inProgress.delete(name);
      console.log(`[backup/full] completed: ${name}`);
    } catch (err) {
      console.error('[backup/full] failed:', err);
      cleanupTmp();
      try { fs.unlinkSync(outPath); } catch {}
      // Keep the job in the map for a bit so UI can see the error, then auto-clear
      inProgress.set(name, { startedAt, kind: 'full', error: err.message });
      setTimeout(() => inProgress.delete(name), 60_000);
    }
  })();
});

module.exports = router;
