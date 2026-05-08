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

async function generateWithOpenAI(prompt, apiKey) {
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
  if (!imageUrl) throw new Error('No image returned from OpenAI');

  const filename = `ai-${Date.now()}.png`;
  const dest = path.join(UPLOAD_DIR, filename);
  await downloadFile(imageUrl, dest);
  return `/uploads/${filename}`;
}

async function generateWithGoogle(prompt, apiKey) {
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateImages({
    model:  'imagen-4.0-generate-001',
    prompt: prompt.trim(),
    config: { numberOfImages: 1, aspectRatio: '16:9' },
  });
  const b64 = response.generatedImages?.[0]?.image?.imageBytes;
  if (!b64) throw new Error('No image returned from Google AI');

  const filename = `ai-${Date.now()}.png`;
  const dest = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
  return `/uploads/${filename}`;
}

// POST /api/admin/generate-image
router.post('/', async (req, res) => {
  try {
    const { prompt, provider = 'openai' } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' });

    const keyName = provider === 'google' ? 'google_ai_api_key' : 'openai_api_key';
    const providerLabel = provider === 'google' ? 'Google AI' : 'OpenAI';

    const [[row]] = await db.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1`,
      [keyName]
    );
    const apiKey = row?.setting_value?.trim();
    if (!apiKey) return res.status(400).json({ error: `${providerLabel} API key not configured in Settings` });

    let url;
    if (provider === 'google') {
      url = await generateWithGoogle(prompt, apiKey);
    } else {
      url = await generateWithOpenAI(prompt, apiKey);
    }

    res.json({ url });
  } catch (err) {
    console.error('generate-image error:', err);
    const msg = err?.error?.message || err?.message || 'Image generation failed';
    res.status(500).json({ error: msg });
  }
});

module.exports = router;
