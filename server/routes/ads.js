const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// ── Ensure new columns exist (runs once on startup) ──────────
(async () => {
  try {
    const [cols] = await db.execute('SHOW COLUMNS FROM ads');
    const names = cols.map(c => c.Field);
    if (!names.includes('starts_at'))  await db.execute('ALTER TABLE ads ADD COLUMN starts_at DATETIME NULL');
    if (!names.includes('expires_at')) await db.execute('ALTER TABLE ads ADD COLUMN expires_at DATETIME NULL');
  } catch {}
})();

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

pub.get('/', async (req, res) => {
  try {
    const { position } = req.query;
    const params = [];
    let where = `WHERE is_active=1
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (expires_at IS NULL OR expires_at >= NOW())`;
    if (position) { where += ' AND position_slug=?'; params.push(position); }
    const [rows] = await db.execute(
      `SELECT id, name, image_url, link_url, position_slug FROM ads ${where} ORDER BY display_order ASC`, params
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN ─────────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

adm.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM ads ORDER BY position_slug, display_order ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.post('/', async (req, res) => {
  try {
    const { name, image_url, link_url, position_slug, is_active, display_order, starts_at, expires_at } = req.body;
    if (!name || !image_url || !position_slug) return res.status(400).json({ error: 'Name, image URL and position required' });
    const [result] = await db.execute(
      'INSERT INTO ads (name, image_url, link_url, position_slug, is_active, display_order, starts_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, image_url, link_url || null, position_slug, is_active ?? 1, display_order ?? 0, starts_at || null, expires_at || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:id/toggle', async (req, res) => {
  try {
    await db.execute('UPDATE ads SET is_active = NOT is_active WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:id', async (req, res) => {
  try {
    const { name, image_url, link_url, position_slug, is_active, display_order, starts_at, expires_at } = req.body;
    await db.execute(
      'UPDATE ads SET name=?, image_url=?, link_url=?, position_slug=?, is_active=?, display_order=?, starts_at=?, expires_at=? WHERE id=?',
      [name, image_url, link_url || null, position_slug, is_active ? 1 : 0, display_order ?? 0, starts_at || null, expires_at || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM ads WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
