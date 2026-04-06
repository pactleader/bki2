const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

pub.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, label, url, display_order, parent_id, open_in_new FROM menu_items WHERE is_active=1 ORDER BY display_order ASC'
    );
    const map = {};
    rows.forEach(r => { map[r.id] = { ...r, children: [] }; });
    const tree = [];
    rows.forEach(r => {
      if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r.id]);
      else tree.push(map[r.id]);
    });
    res.json(tree);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN ─────────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

adm.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM menu_items ORDER BY display_order ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.post('/', async (req, res) => {
  try {
    const { label, url, display_order, parent_id, is_active, open_in_new } = req.body;
    if (!label || !url) return res.status(400).json({ error: 'Label and URL required' });
    const [result] = await db.execute(
      'INSERT INTO menu_items (label, url, display_order, parent_id, is_active, open_in_new) VALUES (?, ?, ?, ?, ?, ?)',
      [label, url, display_order ?? 0, parent_id || null, is_active ?? 1, open_in_new ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.put('/reorder', async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Array required' });
    for (const item of items)
      await db.execute('UPDATE menu_items SET display_order=?, parent_id=? WHERE id=?',
        [item.display_order, item.parent_id || null, item.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:id', async (req, res) => {
  try {
    const { label, url, display_order, parent_id, is_active, open_in_new } = req.body;
    await db.execute(
      'UPDATE menu_items SET label=?, url=?, display_order=?, parent_id=?, is_active=?, open_in_new=? WHERE id=?',
      [label, url, display_order ?? 0, parent_id || null, is_active ? 1 : 0, open_in_new ? 1 : 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM menu_items WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
