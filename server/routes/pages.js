const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uniqueSlug } = require('../utils/slugify');

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

pub.get('/:slug', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, slug, body, meta_title, meta_description, updated_at FROM pages WHERE slug = ? AND is_published = 1 LIMIT 1',
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Page not found' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN CRUD ────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

adm.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, slug, is_published, created_at, updated_at FROM pages ORDER BY updated_at DESC'
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

adm.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM pages WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

adm.post('/', async (req, res) => {
  try {
    const { title, body, meta_title, meta_description, is_published } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const slug = await uniqueSlug('pages', title);
    const [result] = await db.execute(
      'INSERT INTO pages (title, slug, body, meta_title, meta_description, is_published) VALUES (?, ?, ?, ?, ?, ?)',
      [title, slug, body || '', meta_title || null, meta_description || null, is_published ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId, slug });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:id', async (req, res) => {
  try {
    const { title, slug, body, meta_title, meta_description, is_published } = req.body;
    if (!title || !slug) return res.status(400).json({ error: 'Title and slug are required' });
    await db.execute(
      'UPDATE pages SET title=?, slug=?, body=?, meta_title=?, meta_description=?, is_published=? WHERE id=?',
      [title, slug, body || '', meta_title || null, meta_description || null, is_published ? 1 : 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That slug is already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

adm.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM pages WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
