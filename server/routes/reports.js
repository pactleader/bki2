const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uniqueSlug } = require('../utils/slugify');

// Auto-create reports table on first load — same shape as `pages`
async function ensureReportsTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        title         VARCHAR(255)    NOT NULL,
        slug          VARCHAR(200)    NOT NULL,
        body          LONGTEXT,
        meta_title        VARCHAR(255),
        meta_description  VARCHAR(500),
        is_published  TINYINT(1)      NOT NULL DEFAULT 0,
        display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
        created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_reports_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e) { console.warn('reports table ensure skipped:', e.message); }
}
ensureReportsTable();

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

// List all published reports (for auto-populated nav submenu)
pub.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, slug FROM reports WHERE is_published = 1 ORDER BY display_order ASC, title ASC'
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

pub.get('/:slug', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, slug, body, meta_title, meta_description, updated_at FROM reports WHERE slug = ? AND is_published = 1 LIMIT 1',
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Report not found' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN CRUD ────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

adm.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, slug, is_published, display_order, created_at, updated_at FROM reports ORDER BY display_order ASC, updated_at DESC'
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

adm.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM reports WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

adm.post('/', async (req, res) => {
  try {
    const { title, body, meta_title, meta_description, is_published, display_order } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const slug = await uniqueSlug('reports', title);
    const [result] = await db.execute(
      'INSERT INTO reports (title, slug, body, meta_title, meta_description, is_published, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, slug, body || '', meta_title || null, meta_description || null, is_published ? 1 : 0, display_order ?? 0]
    );
    res.status(201).json({ id: result.insertId, slug });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:id', async (req, res) => {
  try {
    const { title, slug, body, meta_title, meta_description, is_published, display_order } = req.body;
    if (!title || !slug) return res.status(400).json({ error: 'Title and slug are required' });
    await db.execute(
      'UPDATE reports SET title=?, slug=?, body=?, meta_title=?, meta_description=?, is_published=?, display_order=? WHERE id=?',
      [title, slug, body || '', meta_title || null, meta_description || null, is_published ? 1 : 0, display_order ?? 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That slug is already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

adm.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM reports WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
