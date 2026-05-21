const express = require('express');
const db      = require('../db');

const router = express.Router();

const SITE_NAME = 'The Background Investigator';
const SITE_URL  = process.env.SITE_URL || 'https://bki2.pacificpact.com';

const BOT_RE = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|discordbot|embedly|outbrain|pinterest|quora|slack|vkshare|w3c_validator|lighthouse|headlesschrome|prerender|crawl|spider|bot\b/i;

// GET /p/:slug
router.get('/:slug/?', async (req, res) => {
  try {
    const ua = req.headers['user-agent'] || '';
    if (!BOT_RE.test(ua)) {
      return res.sendFile(require('path').join(__dirname, '../../dist/index.html'));
    }

    const [rows] = await db.execute(
      'SELECT id, title, slug, body, meta_title, meta_description FROM pages WHERE slug = ? AND is_published = 1 LIMIT 1',
      [req.params.slug]
    );
    if (!rows[0]) return res.redirect(302, '/');

    const p = rows[0];
    const title       = p.meta_title || p.title;
    const description = p.meta_description || '';
    const canonical   = `${SITE_URL}/p/${p.slug}`;
    const safeBody    = (p.body || '').replace(/<script[\s\S]*?<\/script>/gi, '');

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} — ${SITE_NAME}</title>
  ${description ? `<meta name="description" content="${esc(description)}" />` : ''}
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type"        content="website" />
  <meta property="og:site_name"   content="${SITE_NAME}" />
  <meta property="og:title"       content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url"         content="${canonical}" />
  <meta name="twitter:card"        content="summary" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: p.title,
    description,
    url: canonical,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  })}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700&family=Source+Serif+4:ital,wght@0,400;0,600&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f9f8f6; font-family: 'Source Serif 4', Georgia, serif; color: #1a1a1a; }
    img  { max-width: 100%; height: auto; display: block; }
    a    { color: #c0392b; }
    .site-header { background: #0d1b2a; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; }
    .site-header a { color: #fff; font-family: 'Libre Baskerville', Georgia, serif; font-size: 1.25rem; font-weight: 700; text-decoration: none; }
    .site-header nav a { color: rgba(255,255,255,0.7); font-family: 'Outfit', sans-serif; font-size: 0.8rem; text-decoration: none; }
    .page-wrap { max-width: 780px; margin: 0 auto; padding: 48px 24px 80px; }
    h1.page-title { font-family: 'Libre Baskerville', Georgia, serif; font-size: clamp(1.6rem, 3.5vw, 2.4rem); font-weight: 700; line-height: 1.2; color: #0d1b2a; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e5e5e0; }
    .page-body { font-size: 1.0625rem; line-height: 1.85; }
    .page-body p  { margin-bottom: 1.4em; }
    .page-body h2 { font-family: 'Libre Baskerville', serif; font-size: 1.3rem; font-weight: 700; color: #0d1b2a; margin: 2em 0 0.6em; }
    .page-body h3 { font-family: 'Libre Baskerville', serif; font-size: 1.1rem; font-weight: 700; color: #0d1b2a; margin: 1.6em 0 0.5em; }
    .page-body ul, .page-body ol { padding-left: 1.6em; margin-bottom: 1.4em; }
    .page-body li { margin-bottom: 0.4em; }
    .page-body blockquote { border-left: 3px solid #c0392b; margin: 1.5em 0; padding: 0.5em 1.2em; color: #6b7280; font-style: italic; }
    .site-footer { background: #0d1b2a; color: rgba(255,255,255,0.55); font-family: 'Outfit', sans-serif; font-size: 0.8rem; text-align: center; padding: 28px 24px; }
  </style>
</head>
<body>
  <header class="site-header">
    <a href="/">${SITE_NAME}</a>
    <nav style="display:flex;gap:20px;">
      <a href="/">Home</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <div class="page-wrap">
      <h1 class="page-title">${esc(p.title)}</h1>
      <div class="page-body">${safeBody}</div>
    </div>
  </main>
  <footer class="site-footer">
    <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
  </footer>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.send(html);
  } catch (err) {
    console.error('Pages SSR error:', err);
    res.redirect(302, '/');
  }
});

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = router;
