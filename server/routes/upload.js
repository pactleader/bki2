const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { verifyToken } = require('../middleware/auth');

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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase())
            && allowed.test(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

// POST /api/admin/upload
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
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
