const express = require('express');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const http    = require('http');
const { verifyToken } = require('../middleware/auth');
const db      = require('../db');
const { writeImageMetadata } = require('../utils/imageMetadata');

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

  // Try dall-e-3 first; fall back to gpt-image-1 if the model is unavailable
  let response;
  try {
    response = await openai.images.generate({
      model:   'dall-e-3',
      prompt:  prompt.trim(),
      n:       1,
      size:    '1792x1024',
      quality: 'standard',
    });
  } catch (err) {
    if (err?.status === 404 || /does not exist|model_not_found/i.test(err?.message || '')) {
      response = await openai.images.generate({
        model:  'gpt-image-1',
        prompt: prompt.trim(),
        n:      1,
        size:   '1536x1024',
      });
    } else {
      throw err;
    }
  }

  const imageUrl = response.data[0]?.url || response.data[0]?.b64_json && `data:image/png;base64,${response.data[0].b64_json}`;
  if (!imageUrl) throw new Error('No image returned from OpenAI');

  const filename = `ai-${Date.now()}.png`;
  const dest = path.join(UPLOAD_DIR, filename);

  if (imageUrl.startsWith('data:')) {
    const b64 = imageUrl.split(',')[1];
    fs.writeFileSync(dest, Buffer.from(b64, 'base64'));
  } else {
    await downloadFile(imageUrl, dest);
  }
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
    const { prompt, provider = 'openai', title, description, author, copyright } = req.body;
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

    try {
      const filePath = path.join(UPLOAD_DIR, path.basename(url));
      await writeImageMetadata(filePath, { title, description, author, copyright });
    } catch (e) { console.warn('metadata write skipped:', e.message); }

    res.json({ url });
  } catch (err) {
    console.error('generate-image error:', err);
    // Google SDK wraps errors as { error: { code, message, status } }
    const msg = err?.error?.message || err?.response?.data?.error?.message || err?.message || 'Image generation failed';
    const status = err?.error?.code === 429 ? 429 : 500;
    res.status(status).json({ error: msg });
  }
});

module.exports = router;
