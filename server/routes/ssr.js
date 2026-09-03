const express = require('express');
const db      = require('../db');

const router  = express.Router();

const SITE_NAME = 'The Background Investigator';
const SITE_URL  = process.env.SITE_URL || 'https://thebackgroundinvestigator.com';

async function getSiteTimezone() {
  try {
    const [[row]] = await db.execute(`SELECT setting_value FROM site_settings WHERE setting_key = 'site_timezone' LIMIT 1`);
    return row?.setting_value || 'Pacific/Saipan';
  } catch { return 'Pacific/Saipan'; }
}

const BOT_RE = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|discordbot|embedly|outbrain|pinterest|quora|slack|vkshare|w3c_validator|lighthouse|headlesschrome|prerender|crawl|spider|bot\b/i;

const ARTICLE_SQL = `
  SELECT a.id, a.title, a.slug, a.excerpt, a.body, a.featured_image,
         a.publish_date, a.seo_title, a.seo_description, a.seo_keywords,
         a.og_image, a.schema_json, a.use_slug_only,
         u.display_name AS author_name,
         c.name AS category_name
  FROM articles a
  JOIN users u ON a.author_id = u.id
  JOIN categories c ON a.category_id = c.id`;

// GET /Articles/:slug/:id/  — legacy format (old articles)
router.get('/:slug/:id([0-9]+)/?', async (req, res) => {
  try {
    const ua = req.headers['user-agent'] || '';
    if (!BOT_RE.test(ua)) {
      return res.sendFile(require('path').join(__dirname, '../../dist/index.html'));
    }
    const [rows] = await db.execute(
      `${ARTICLE_SQL} WHERE a.id = ? AND a.status = 'published' AND a.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.redirect(302, '/');
    const canonical = `${SITE_URL}/Articles/${rows[0].slug}/${rows[0].id}/`;
    const tz = await getSiteTimezone();
    return renderArticle(res, rows[0], canonical, tz);
  } catch (err) {
    console.error('SSR error:', err);
    res.redirect(302, '/');
  }
});

// GET /Articles/:slug/  — new format (slug-only articles)
router.get('/:slug/?', async (req, res) => {
  try {
    const ua = req.headers['user-agent'] || '';
    if (!BOT_RE.test(ua)) {
      return res.sendFile(require('path').join(__dirname, '../../dist/index.html'));
    }
    const [rows] = await db.execute(
      `${ARTICLE_SQL} WHERE a.slug = ? AND a.use_slug_only = 1 AND a.status = 'published' AND a.deleted_at IS NULL LIMIT 1`,
      [req.params.slug]
    );
    if (!rows[0]) return res.redirect(302, '/');
    const canonical = `${SITE_URL}/Articles/${rows[0].slug}/`;
    const tz = await getSiteTimezone();
    return renderArticle(res, rows[0], canonical, tz);
  } catch (err) {
    console.error('SSR error:', err);
    res.redirect(302, '/');
  }
});

function renderArticle(res, a, canonical, tz = 'Pacific/Saipan') {
  db.execute('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [a.id]).catch(() => {});

  const title       = a.seo_title || a.title;
  const description = a.seo_description || a.excerpt || '';
  // For og:image only use actual images (not videos)
  const isVideoUrl = (u) => u && /(\.(mp4|webm|ogv|mov)(\?|$)|youtube\.com|youtu\.be|vimeo\.com)/i.test(u);
  const rawImage    = a.og_image || (isVideoUrl(a.featured_image) ? '' : a.featured_image) || '';
  const image       = rawImage
    ? (rawImage.startsWith('http') ? rawImage : `${SITE_URL}${rawImage}`)
    : `${SITE_URL}/og-image.svg`;
  const pubDate     = a.publish_date
    ? new Date(a.publish_date).toLocaleDateString('en-US', { timeZone: tz, year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const featuredImg = a.featured_image || '';
  const featuredType = (() => {
    const u = featuredImg.toLowerCase();
    if (/\.(mp4|webm|ogv|mov)(\?|$)/.test(u)) return 'video';
    if (/(?:youtube\.com|youtu\.be)/.test(u)) return 'youtube';
    if (/vimeo\.com/.test(u)) return 'vimeo';
    return 'image';
  })();
  const ytMatch = featuredType === 'youtube' && featuredImg.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  const vmMatch = featuredType === 'vimeo' && featuredImg.match(/vimeo\.com\/(\d+)/);
  const featuredHtml = !featuredImg ? ''
    : featuredType === 'video'   ? `<div class="featured-img"><video src="${esc(featuredImg)}" autoplay muted loop playsinline controls></video></div>`
    : featuredType === 'youtube' && ytMatch ? `<div class="featured-img"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:100%;aspect-ratio:16/9;"></iframe></div>`
    : featuredType === 'vimeo'   && vmMatch ? `<div class="featured-img"><iframe src="https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1&muted=1&loop=1" frameborder="0" allow="autoplay" style="width:100%;aspect-ratio:16/9;"></iframe></div>`
    : `<div class="featured-img"><img src="${esc(featuredImg)}" alt="${esc(a.title)}" /></div>`;
  const safeBody    = normalizeArticleBody(a.body || '');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} — ${SITE_NAME}</title>
  <meta name="description" content="${esc(description)}" />
  ${a.seo_keywords ? `<meta name="keywords" content="${esc(a.seo_keywords)}" />` : ''}
  <link rel="canonical" href="${canonical}" />

  <!-- OpenGraph -->
  <meta property="og:type"        content="article" />
  <meta property="og:site_name"   content="${SITE_NAME}" />
  <meta property="og:title"       content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url"         content="${canonical}" />
  <meta property="og:image"        content="${esc(image)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type"   content="image/jpeg" />
  <meta property="og:locale"       content="en_US" />
  ${pubDate ? `<meta property="article:published_time" content="${new Date(a.publish_date).toISOString()}" />` : ''}

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image"       content="${esc(image)}" />

  <!-- Structured Data -->
  <script type="application/ld+json">${a.schema_json ? a.schema_json.trim() : JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: a.title,
    description: a.excerpt || '',
    image: image ? [image] : undefined,
    datePublished: a.publish_date ? new Date(a.publish_date).toISOString() : undefined,
    author: { '@type': 'Person', name: a.author_name },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  })}</script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700&family=Source+Serif+4:ital,wght@0,400;0,600&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { background: #f9f8f6; font-family: 'Source Serif 4', Georgia, serif; color: #1a1a1a; }
    img  { max-width: 100%; height: auto; display: block; }
    a    { color: #c0392b; text-decoration: none; }
    a:hover { text-decoration: underline; }

    :root {
      --f-display: 'Libre Baskerville', Georgia, serif;
      --f-body:    'Source Serif 4', Georgia, serif;
      --f-ui:      'Outfit', system-ui, sans-serif;
      --color-primary: #0d1b2a;
      --color-accent:  #c0392b;
      --color-border:  #e5e5e0;
      --color-text-secondary: #6b7280;
    }

    .wrap { max-width: 1280px; margin: 0 auto; padding: 0 24px; }

    /* ── Header ── */
    .site-header {
      background: #0d1b2a;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .site-header a { color: #fff; font-family: 'Libre Baskerville', Georgia, serif; font-size: 1.25rem; font-weight: 700; }

    /* ── Article layout ── */
    .article-wrap { max-width: 780px; margin: 0 auto; padding: 40px 24px 80px; }
    .breadcrumb { font-family: 'Outfit', sans-serif; font-size: 0.75rem; color: var(--color-text-secondary); margin-bottom: 20px; }
    .breadcrumb a { color: #c0392b; }
    .cat-tag {
      display: inline-block;
      font-family: 'Outfit', sans-serif; font-size: 0.7rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.2px;
      background: #c0392b; color: #fff;
      padding: 3px 10px; border-radius: 2px; margin-bottom: 16px;
    }
    h1.article-title {
      font-family: 'Libre Baskerville', Georgia, serif;
      font-size: clamp(1.6rem, 3.5vw, 2.5rem);
      font-weight: 700; line-height: 1.18; letter-spacing: -0.5px;
      color: #1a1a1a; margin-bottom: 20px;
    }
    .article-meta {
      font-family: 'Outfit', sans-serif; font-size: 0.875rem;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 18px; margin-bottom: 28px;
    }
    .article-meta strong { color: #1a1a1a; }
    .featured-img { border-radius: 6px; overflow: hidden; margin-bottom: 32px; }
    .featured-img img { width: 100%; max-height: 480px; object-fit: cover; }
    .article-body {
      font-family: 'Source Serif 4', Georgia, serif;
      font-size: 1.125rem; line-height: 1.85; color: #1a1a1a;
      overflow-wrap: normal;
      word-break: normal;
      hyphens: manual;
      max-width: 100%;
      min-width: 0;
    }
    .article-body p  { margin-bottom: 1.4em; }
    .article-body h2 { font-family: 'Libre Baskerville', serif; font-size: 1.4rem; font-weight: 700; margin: 2em 0 0.6em; }
    .article-body h3 { font-family: 'Libre Baskerville', serif; font-size: 1.15rem; font-weight: 700; margin: 1.6em 0 0.5em; }
    .article-body blockquote {
      border-left: 3px solid #c0392b; margin: 1.5em 0; padding: 0.5em 1.2em;
      color: var(--color-text-secondary); font-style: italic;
    }
    .article-body ul, .article-body ol { padding-left: 1.6em; margin-bottom: 1.4em; }
    .article-body li { margin-bottom: 0.4em; }
    .article-body p, .article-body li, .article-body h1, .article-body h2,
    .article-body h3, .article-body h4, .article-body blockquote, .article-body span {
      white-space: normal !important;
      overflow-wrap: normal !important;
      word-break: normal !important;
      word-wrap: normal !important;
      hyphens: manual;
      max-width: 100%;
      min-width: 0;
    }
    .article-body p, .article-body li, .article-body h1, .article-body h2,
    .article-body h3, .article-body h4, .article-body blockquote {
      width: 100%;
    }
    .article-body span {
      display: inline !important;
    }
    .article-body * { box-sizing: border-box; max-width: 100%; }
    .article-body table {
      display: block;
      width: max-content;
      min-width: 100%;
      max-width: 100%;
      overflow-x: auto;
      table-layout: auto;
    }
    .article-body td, .article-body th {
      overflow-wrap: normal;
      word-break: normal;
    }
    .article-body pre {
      white-space: pre-wrap;
      overflow-x: auto;
      overflow-wrap: anywhere;
    }
    .article-body a  {
      color: #c0392b;
      overflow-wrap: anywhere;
      word-break: normal;
    }
    .article-body iframe, .article-body video, .article-body embed { width: 100%; }

    /* ── Footer ── */
    .site-footer {
      background: #0d1b2a; color: rgba(255,255,255,0.55);
      font-family: 'Outfit', sans-serif; font-size: 0.8rem;
      text-align: center; padding: 28px 24px;
    }
    .site-footer a { color: rgba(255,255,255,0.7); }

    /* ── SPA handoff notice ── */
    .spa-link {
      display: block; text-align: center;
      font-family: 'Outfit', sans-serif; font-size: 0.875rem;
      color: var(--color-text-secondary); margin-top: 40px;
    }
  </style>
</head>
<body>

  <header class="site-header">
    <a href="/">${SITE_NAME}</a>
    <nav style="font-family:'Outfit',sans-serif;font-size:0.8rem;display:flex;gap:20px;">
      <a href="/" style="color:rgba(255,255,255,0.7)">Home</a>
      <a href="/contact" style="color:rgba(255,255,255,0.7)">Contact</a>
    </nav>
  </header>

  <main>
    <div class="article-wrap">
      <div class="breadcrumb">
        <a href="/">Home</a> &rsaquo;
        <a href="/">${esc(a.category_name)}</a> &rsaquo;
        ${esc(a.title.substring(0, 50))}${a.title.length > 50 ? '&hellip;' : ''}
      </div>

      <span class="cat-tag">${esc(a.category_name)}</span>

      <h1 class="article-title">${esc(a.title)}</h1>

      <div class="article-meta">
        By <strong>${esc(a.author_name)}</strong>${pubDate ? ` &nbsp;&middot;&nbsp; ${pubDate}` : ''}
      </div>

      ${featuredHtml}

      <div class="article-body">${safeBody || `<p>${esc(description)}</p>`}</div>

      <p class="spa-link"><a href="/">← Back to ${SITE_NAME}</a></p>
    </div>
  </main>

  <footer class="site-footer">
    <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
  </footer>

  <script>
    document.querySelectorAll('a[href="/"]').forEach(a => {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = '/';
      });
    });
  </script>
</body>
</html>`;

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
  res.send(html);
}

// Simple HTML escape
function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeArticleBody(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/&nbsp;|&#160;|&#xA0;| /gi, ' ')
    .replace(/white-space\s*:\s*nowrap\s*;?/gi, '')
    .replace(/word-break\s*:\s*break-all\s*;?/gi, '')
    .replace(/overflow-wrap\s*:\s*anywhere\s*;?/gi, '');
}

module.exports = router;
