const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

pub.get('/', async (req, res) => {
  try {
    const { position } = req.query;
    let where = 'WHERE is_active=1';
    const params = [];
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
    const { name, image_url, link_url, position_slug, is_active, display_order } = req.body;
    if (!name || !image_url || !position_slug) return res.status(400).json({ error: 'Name, image URL and position required' });
    const [result] = await db.execute(
      'INSERT INTO ads (name, image_url, link_url, position_slug, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?)',
      [name, image_url, link_url || null, position_slug, is_active ?? 1, display_order ?? 0]
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
    const { name, image_url, link_url, position_slug, is_active, display_order } = req.body;
    await db.execute(
      'UPDATE ads SET name=?, image_url=?, link_url=?, position_slug=?, is_active=?, display_order=? WHERE id=?',
      [name, image_url, link_url || null, position_slug, is_active ? 1 : 0, display_order ?? 0, req.params.id]
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
