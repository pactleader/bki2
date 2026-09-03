const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { verifyToken } = require('../middleware/auth');
const { writeImageMetadata } = require('../utils/imageMetadata');

const router = express.Router();
router.use(verifyToken);

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext)
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
    const name = `${base}-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const ALLOWED_EXT  = /\.(jpeg|jpg|png|gif|webp|svg|mp4|webm|ogv|mov)$/;
const ALLOWED_MIME = /^(image\/(jpeg|png|gif|webp|svg\+xml)|video\/(mp4|webm|ogg|quicktime))$/;
const VIDEO_EXT    = /\.(mp4|webm|ogv|mov)$/;

const upload = multer({
  storage,
  limits: { fileSize: 400 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok  = ALLOWED_EXT.test(ext) && ALLOWED_MIME.test(file.mimetype);
    cb(ok ? null : new Error('Only image or video files are allowed'), ok);
  },
});

// POST /api/admin/upload
router.post('/', (req, res, next) => {
  upload.single('image')(req, res, async err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const filePath = req.file.path;
    const url = `/uploads/${req.file.filename}`;
    const isVideo = VIDEO_EXT.test(path.extname(req.file.filename).toLowerCase());
    if (!isVideo) {
      try {
        const { title, description, author, copyright } = req.body;
        await writeImageMetadata(filePath, { title, description, author, copyright });
      } catch (e) { console.warn('metadata write skipped:', e.message); }
    }
    res.json({ url, type: isVideo ? 'video' : 'image' });
  });
});

// DELETE /api/admin/upload  (optional cleanup)
router.delete('/', (req, res) => {
  const { filename } = req.body;
  if (!filename || filename.includes('/') || filename.includes('..'))
    return res.status(400).json({ error: 'Invalid filename' });
  const full = path.join(UPLOAD_DIR, filename);
  fs.unlink(full, err => {
    if (err) return res.status(404).json({ error: 'File not found' });
    res.json({ ok: true });
  });
});

module.exports = router;
