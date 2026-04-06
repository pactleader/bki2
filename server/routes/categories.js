const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uniqueSlug }                = require('../utils/slugify');

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

pub.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT c.*, COUNT(a.id) AS article_count
       FROM categories c
       LEFT JOIN articles a ON a.category_id = c.id AND a.status = 'published'
       GROUP BY c.id ORDER BY c.display_order ASC, c.name ASC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

pub.get('/:slug', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT c.*, COUNT(a.id) AS article_count
       FROM categories c
       LEFT JOIN articles a ON a.category_id = c.id AND a.status = 'published'
       WHERE c.slug = ? GROUP BY c.id LIMIT 1`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN ─────────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

adm.post('/', async (req, res) => {
  try {
    const { name, color_hex, display_order, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const slug = await uniqueSlug('categories', name);
    const [result] = await db.execute(
      'INSERT INTO categories (name, slug, color_hex, display_order, description) VALUES (?, ?, ?, ?, ?)',
      [name, slug, color_hex || '#444444', display_order ?? 0, description || null]
    );
    res.status(201).json({ id: result.insertId, slug });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

adm.put('/reorder', async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Array required' });
    for (const item of items)
      await db.execute('UPDATE categories SET display_order=? WHERE id=?', [item.display_order, item.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:id', async (req, res) => {
  try {
    const { name, color_hex, display_order, description } = req.body;
    const [existing] = await db.execute('SELECT slug FROM categories WHERE id=? LIMIT 1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Not found' });
    const slug = name ? await uniqueSlug('categories', name, parseInt(req.params.id)) : existing[0].slug;
    await db.execute(
      'UPDATE categories SET name=?, slug=?, color_hex=?, display_order=?, description=? WHERE id=?',
      [name, slug, color_hex || '#444444', display_order ?? 0, description || null, req.params.id]
    );
    res.json({ ok: true, slug });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

adm.delete('/:id', async (req, res) => {
  try {
    const [[{ cnt }]] = await db.execute('SELECT COUNT(*) AS cnt FROM articles WHERE category_id=?', [req.params.id]);
    if (cnt > 0) return res.status(409).json({ error: 'Category has articles. Reassign them first.' });
    await db.execute('DELETE FROM categories WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
