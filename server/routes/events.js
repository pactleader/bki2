const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

pub.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, event_date, start_date, end_date, location, description, url FROM events WHERE is_active=1 ORDER BY start_date ASC, display_order ASC'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN ─────────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

adm.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM events ORDER BY start_date ASC, display_order ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.post('/', async (req, res) => {
  try {
    const { title, event_date, start_date, end_date, location, description, url, is_active, display_order } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: 'Title and date required' });
    const [result] = await db.execute(
      'INSERT INTO events (title, event_date, start_date, end_date, location, description, url, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, event_date, start_date || null, end_date || null, location || null, description || null, url || null, is_active ?? 1, display_order ?? 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:id/toggle', async (req, res) => {
  try {
    await db.execute('UPDATE events SET is_active = NOT is_active WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:id', async (req, res) => {
  try {
    const { title, event_date, start_date, end_date, location, description, url, is_active, display_order } = req.body;
    await db.execute(
      'UPDATE events SET title=?, event_date=?, start_date=?, end_date=?, location=?, description=?, url=?, is_active=?, display_order=? WHERE id=?',
      [title, event_date, start_date || null, end_date || null, location || null, description || null, url || null, is_active ? 1 : 0, display_order ?? 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM events WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
