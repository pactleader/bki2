const express = require('express');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const http    = require('http');
const { verifyToken } = require('../middleware/auth');
const db      = require('../db');

const router = express.Router();
router.use(verifyToken);

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file  = fs.createWriteStream(dest);
    proto.get(url, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// POST /api/admin/generate-image
router.post('/', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' });

    // Load API key from DB settings at request time so changes take effect immediately
    const [[row]] = await db.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'openai_api_key' LIMIT 1`
    );
    const apiKey = row?.setting_value?.trim();
    if (!apiKey) return res.status(400).json({ error: 'OpenAI API key not configured in Settings' });

    // Lazy-load openai so the server still starts even if the package isn't installed yet
    const { default: OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey });

    const response = await openai.images.generate({
      model:   'dall-e-3',
      prompt:  prompt.trim(),
      n:       1,
      size:    '1792x1024',
      quality: 'standard',
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) return res.status(500).json({ error: 'No image returned from OpenAI' });

    // Download and save to /uploads/ so the URL is permanent (OpenAI URLs expire in ~1h)
    const filename = `ai-${Date.now()}.png`;
    const dest     = path.join(UPLOAD_DIR, filename);
    await downloadFile(imageUrl, dest);

    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('generate-image error:', err);
    const msg = err?.error?.message || err?.message || 'Image generation failed';
    res.status(500).json({ error: msg });
  }
});

module.exports = router;
