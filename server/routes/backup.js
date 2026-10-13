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

// GET /api/admin/backup/list  — list stored backups
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => /^backup-.*\.(zip|sql)$/.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUPS_DIR, f));
        return { name: f, size: stat.size, created_at: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(files);
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

// POST /api/admin/backup/full  — generate full backup (DB + uploads) as zip
router.post('/full', (req, res) => {
  const name = `backup-full-${timestamp()}.zip`;
  const outPath = path.join(BACKUPS_DIR, name);
  const out = fs.createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 6 } });

  let responded = false;
  function fail(status, msg) {
    if (responded) return;
    responded = true;
    try { archive.destroy(); out.destroy(); fs.unlinkSync(outPath); } catch {}
    res.status(status).json({ error: msg });
  }

  archive.on('warning', err => { if (err.code !== 'ENOENT') console.warn('archive warning:', err); });
  archive.on('error', err => fail(500, err.message));
  archive.pipe(out);

  // 1) DB dump as sql file inside the zip
  const dump = spawnMysqldump();
  let stderr = '';
  dump.stderr.on('data', chunk => { stderr += chunk.toString(); });
  dump.on('error', err => fail(500, `mysqldump failed to start: ${err.message}. Ensure mysqldump is on PATH.`));

  archive.append(dump.stdout, { name: 'database.sql' });

  dump.on('close', code => {
    if (code !== 0) {
      const relevantErr = stderr.replace(/mysqldump: \[Warning\].*password.*insecure.*\n?/gi, '').trim();
      return fail(500, relevantErr || `mysqldump exited with code ${code}`);
    }
    // 2) Add uploads folder
    if (fs.existsSync(UPLOADS_DIR)) {
      archive.directory(UPLOADS_DIR, 'uploads');
    }
    // 3) Add a small README with metadata
    archive.append(
      `BKI Site Backup\n` +
      `Generated: ${new Date().toISOString()}\n` +
      `Database: ${process.env.DB_NAME}\n\n` +
      `Contents:\n` +
      `- database.sql — mysqldump output (import with: mysql -u user -p dbname < database.sql)\n` +
      `- uploads/     — contents of /public/uploads (all images and media)\n`,
      { name: 'README.txt' }
    );
    archive.finalize();
  });

  out.on('close', () => {
    if (responded) return;
    responded = true;
    pruneOldBackups();
    const stat = fs.statSync(outPath);
    res.json({ name, size: stat.size, created_at: stat.mtime.toISOString() });
  });
});

module.exports = router;
