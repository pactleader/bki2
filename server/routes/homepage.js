const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

pub.get('/', async (req, res) => {
  try {
    const [sections] = await db.execute(
      `SELECT hs.id, hs.category_id, hs.display_order, hs.article_count, hs.layout,
              c.name AS cat_name, c.slug AS cat_slug, c.color_hex
       FROM homepage_sections hs
       JOIN categories c ON hs.category_id = c.id
       WHERE hs.is_active = 1
       ORDER BY hs.display_order ASC`
    );

    const sectionsWithArticles = await Promise.all(sections.map(async (sec) => {
      const [articles] = await db.execute(
        `SELECT a.id, a.title, a.slug, a.excerpt, a.featured_image, a.publish_date, a.view_count,
                u.display_name AS author_name,
                c.name AS category_name, c.slug AS category_slug, c.color_hex AS category_color
         FROM articles a
         JOIN users u ON a.author_id = u.id
         JOIN categories c ON a.category_id = c.id
         WHERE a.category_id = ? AND a.status = 'published'
           AND (a.publish_date IS NULL OR a.publish_date <= NOW())
         ORDER BY a.publish_date DESC, a.created_at DESC
         LIMIT ${parseInt(sec.article_count, 10)}`,
        [sec.category_id]
      );
      // Normalize to same shape as /api/articles
      const normalized = articles.map(a => ({
        id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt,
        featured_image: a.featured_image, publish_date: a.publish_date, view_count: a.view_count,
        author: { display_name: a.author_name },
        category: { id: sec.category_id, name: a.category_name, slug: a.category_slug, color_hex: a.category_color },
      }));
      return {
        category: { id: sec.category_id, name: sec.cat_name, slug: sec.cat_slug, color_hex: sec.color_hex },
        layout: sec.layout,
        articles: normalized,
      };
    }));

    const [settingRows] = await db.execute(
      `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('most_read_article_ids', 'highlight_items', 'hero_category_id')`
    );
    const settings = {};
    settingRows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    let mostRead = [];
    try {
      const ids = JSON.parse(settings.most_read_article_ids || '[]');
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        const [mrRows] = await db.execute(
          `SELECT a.id, a.title, a.slug, a.excerpt, a.featured_image, a.publish_date,
                  c.name AS category_name, c.slug AS category_slug, c.color_hex
           FROM articles a JOIN categories c ON a.category_id = c.id
           WHERE a.id IN (${placeholders}) AND a.status = 'published'`,
          ids
        );
        const map = {};
        mrRows.forEach(r => { map[r.id] = r; });
        mostRead = ids.map(id => map[id]).filter(Boolean);
      }
    } catch {}

    let highlights = [];
    try { highlights = JSON.parse(settings.highlight_items || '[]'); } catch {}

    const heroCategoryId = settings.hero_category_id || null;

    res.json({ sections: sectionsWithArticles, mostRead, highlights, heroCategoryId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/most-read  — lightweight, used by sidebar on all pages
pub.get('/most-read', async (req, res) => {
  try {
    const [[setting]] = await db.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'most_read_article_ids' LIMIT 1`
    );
    const ids = JSON.parse(setting?.setting_value || '[]');
    if (!ids.length) return res.json([]);

    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT a.id, a.title, a.slug, a.publish_date,
              c.name AS category_name, c.color_hex
       FROM articles a JOIN categories c ON a.category_id = c.id
       WHERE a.id IN (${placeholders}) AND a.status = 'published'`,
      ids
    );
    // Return in the saved order
    const map = {};
    rows.forEach(r => { map[r.id] = r; });
    res.json(ids.map(id => map[id]).filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ADMIN ─────────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

adm.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT hs.*, c.name AS cat_name, c.slug AS cat_slug, c.color_hex
       FROM homepage_sections hs
       JOIN categories c ON hs.category_id = c.id
       ORDER BY hs.display_order ASC`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.post('/', async (req, res) => {
  try {
    const { category_id, display_order, article_count, layout, is_active } = req.body;
    if (!category_id) return res.status(400).json({ error: 'category_id required' });
    const [result] = await db.execute(
      'INSERT INTO homepage_sections (category_id, display_order, article_count, layout, is_active) VALUES (?, ?, ?, ?, ?)',
      [category_id, display_order ?? 0, article_count ?? 4, layout || 'band', is_active ?? 1]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Category already on homepage' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

adm.put('/reorder', async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Array required' });
    for (const item of items)
      await db.execute('UPDATE homepage_sections SET display_order=? WHERE id=?', [item.display_order, item.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:id', async (req, res) => {
  try {
    const { display_order, article_count, layout, is_active } = req.body;
    await db.execute(
      'UPDATE homepage_sections SET display_order=?, article_count=?, layout=?, is_active=? WHERE id=?',
      [display_order ?? 0, article_count ?? 4, layout || 'band', is_active ? 1 : 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM homepage_sections WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
