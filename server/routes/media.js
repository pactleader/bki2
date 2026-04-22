const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { verifyToken } = require('../middleware/auth');

const router   = express.Router();
const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

router.use(verifyToken);

const IMAGE_RE = /\.(jpe?g|png|gif|webp|svg)$/i;
const VIDEO_RE = /\.(mp4|webm|ogg|mov)$/i;
const DOC_RE   = /\.(pdf|doc|docx|xls|xlsx|csv|txt)$/i;

function fileType(name) {
  if (IMAGE_RE.test(name)) return 'image';
  if (VIDEO_RE.test(name)) return 'video';
  if (DOC_RE.test(name))   return 'document';
  return 'other';
}

// GET /api/admin/media — list all files
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR)
      .filter(f => !f.startsWith('.'))
      .map(filename => {
        const full = path.join(UPLOAD_DIR, filename);
        const stat = fs.statSync(full);
        return {
          filename,
          url: `/uploads/${filename}`,
          size: stat.size,
          type: fileType(filename),
          uploaded_at: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Could not read media directory' });
  }
});

// DELETE /api/admin/media/:filename
router.delete('/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!filename || filename.includes('/') || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const full = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'File not found' });
  fs.unlink(full, err => {
    if (err) return res.status(500).json({ error: 'Delete failed' });
    res.json({ ok: true });
  });
});

// POST /api/admin/media/upload — multi-file upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 400 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok  = /\.(jpe?g|png|gif|webp|svg|pdf|mp4|webm)$/.test(ext);
    cb(ok ? null : new Error('File type not allowed'), ok);
  },
});

router.post('/upload', upload.array('files', 20), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
  const result = req.files.map(f => ({
    filename: f.filename,
    url: `/uploads/${f.filename}`,
    size: f.size,
    type: fileType(f.filename),
    uploaded_at: new Date().toISOString(),
  }));
  res.json(result);
});

module.exports = router;
