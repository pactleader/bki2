const express = require('express');
const db      = require('../db');

const router = express.Router();

const BASE_URL = process.env.SITE_URL || 'https://thebackgroundinvestigator.com';

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function fmt(date) {
  if (!date) return new Date().toISOString().slice(0, 10);
  return new Date(date).toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  try {
    const [articles] = await db.execute(
      `SELECT a.id, a.slug, a.publish_date, a.updated_at, a.use_slug_only
       FROM articles a
       WHERE a.status = 'published' AND a.deleted_at IS NULL
       ORDER BY COALESCE(a.publish_date, a.created_at) DESC`
    );

    const [categories] = await db.execute(
      `SELECT slug FROM categories ORDER BY name`
    );

    const [pages] = await db.execute(
      `SELECT slug, updated_at FROM pages WHERE is_published = 1`
    );

    const staticUrls = [
      { loc: BASE_URL, priority: '1.0', changefreq: 'daily' },
      { loc: `${BASE_URL}/archive`, priority: '0.6', changefreq: 'daily' },
      { loc: `${BASE_URL}/advertise`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${BASE_URL}/contact`, priority: '0.4', changefreq: 'monthly' },
    ];

    const categoryUrls = categories.map(c => ({
      loc: `${BASE_URL}/category/${escapeXml(c.slug)}`,
      priority: '0.7',
      changefreq: 'daily',
    }));

    const pageUrls = pages.map(p => ({
      loc: `${BASE_URL}/p/${escapeXml(p.slug)}`,
      lastmod: fmt(p.updated_at),
      priority: '0.5',
      changefreq: 'monthly',
    }));

    const articleUrls = articles.map(a => ({
      loc: a.use_slug_only
        ? `${BASE_URL}/Articles/${escapeXml(a.slug)}/`
        : `${BASE_URL}/Articles/${escapeXml(a.slug)}/${a.id}/`,
      lastmod: fmt(a.updated_at || a.publish_date),
      priority: '0.8',
      changefreq: 'weekly',
    }));

    const allUrls = [...staticUrls, ...categoryUrls, ...pageUrls, ...articleUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Sitemap generation failed');
  }
});

module.exports = router;
