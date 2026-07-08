const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// ── PUBLIC middleware — fires 301 before any page route ───────
const pub = express.Router();

pub.get('*', async (req, res, next) => {
  // Skip API and admin paths — those are handled by their own routes
  if (req.path.startsWith('/api/') || req.path.startsWith('/admin')) return next();
  try {
    const path = req.path === '' ? '/' : req.path;
    const [rows] = await db.execute(
      'SELECT to_url FROM redirects WHERE from_path = ? AND is_active = 1 LIMIT 1',
      [path]
    );
    if (rows.length) return res.redirect(301, rows[0].to_url);
    next();
  } catch {
    next();
  }
});

// ── ADMIN CRUD ────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

adm.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM redirects ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

adm.post('/', async (req, res) => {
  try {
    const { from_path, to_url, is_active } = req.body;
    if (!from_path || !to_url) return res.status(400).json({ error: 'from_path and to_url are required' });
    const normalized = from_path.startsWith('/') ? from_path : '/' + from_path;
    const [result] = await db.execute(
      'INSERT INTO redirects (from_path, to_url, is_active) VALUES (?, ?, ?)',
      [normalized, to_url, is_active ?? 1]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A redirect for that path already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

adm.put('/:id', async (req, res) => {
  try {
    const { from_path, to_url, is_active } = req.body;
    if (!from_path || !to_url) return res.status(400).json({ error: 'from_path and to_url are required' });
    const normalized = from_path.startsWith('/') ? from_path : '/' + from_path;
    await db.execute(
      'UPDATE redirects SET from_path=?, to_url=?, is_active=? WHERE id=?',
      [normalized, to_url, is_active ? 1 : 0, req.params.id]
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

adm.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM redirects WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
