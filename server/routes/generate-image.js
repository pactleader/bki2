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

// POST /api/admin/generate-image/suggest-prompt
router.post('/suggest-prompt', async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title && !body) return res.status(400).json({ error: 'title or body required' });

    const [[row]] = await db.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'openai_api_key' LIMIT 1`
    );
    const apiKey = row?.setting_value?.trim();
    if (!apiKey) return res.status(400).json({ error: 'OpenAI API key not configured in Settings' });

    const { default: OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey });

    // Strip HTML tags and truncate body to ~800 chars for context
    const plainBody = (body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: 'You write concise image generation prompts for newspaper article featured images. Write a single prompt (1-2 sentences, no bullet points). The image must be professional, photorealistic, no text or words in the image. Focus on the key visual concept from the article.',
        },
        {
          role: 'user',
          content: `Article title: "${title}"\n\nArticle excerpt:\n${plainBody || '(no body yet)'}`,
        },
      ],
    });

    const suggested = completion.choices[0]?.message?.content?.trim() || '';
    res.json({ prompt: suggested });
  } catch (err) {
    console.error('suggest-prompt error:', err);
    res.status(500).json({ error: err.message || 'Failed to suggest prompt' });
  }
});

// POST /api/admin/generate-image/generate-seo
router.post('/generate-seo', async (req, res) => {
  try {
    const { title, body, excerpt } = req.body;
    if (!title && !body && !excerpt) return res.status(400).json({ error: 'title, excerpt or body required' });

    const [[row]] = await db.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'openai_api_key' LIMIT 1`
    );
    const apiKey = row?.setting_value?.trim();
    if (!apiKey) return res.status(400).json({ error: 'OpenAI API key not configured in Settings' });

    const { default: OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey });

    const plainBody = (body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You write SEO metadata for news articles. Return a JSON object with exactly three keys: "seo_title" (max 60 chars, compelling, keyword-rich, no clickbait), "seo_description" (max 160 chars, informative summary that reads naturally and includes primary keywords), and "seo_keywords" (5-10 relevant keywords separated by commas, no hashtags). Do not wrap in markdown.',
        },
        {
          role: 'user',
          content: `Article title: "${title || ''}"\n\nExcerpt: "${excerpt || ''}"\n\nArticle body:\n${plainBody || '(no body yet)'}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return res.status(500).json({ error: 'AI returned invalid JSON' }); }
    res.json({
      seo_title:       String(parsed.seo_title       || '').slice(0, 70),
      seo_description: String(parsed.seo_description || '').slice(0, 180),
      seo_keywords:    String(parsed.seo_keywords    || '').slice(0, 300),
    });
  } catch (err) {
    console.error('generate-seo error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate SEO metadata' });
  }
});

// POST /api/admin/generate-image
router.post('/', async (req, res) => {
  try {
    const { prompt, title, description, author, copyright } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' });

    const [[row]] = await db.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'openai_api_key' LIMIT 1`
    );
    const apiKey = row?.setting_value?.trim();
    if (!apiKey) return res.status(400).json({ error: 'OpenAI API key not configured in Settings' });

    const url = await generateWithOpenAI(prompt, apiKey);

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
