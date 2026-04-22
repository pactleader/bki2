const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// Ensure table exists
db.execute(`
  CREATE TABLE IF NOT EXISTS subscribers (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    status     ENUM('active','unsubscribed') NOT NULL DEFAULT 'active',
    source     VARCHAR(64) DEFAULT 'website',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`).catch(err => console.error('subscribers table error:', err.message));

const pub = express.Router();
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

// POST /api/subscribe
pub.post('/', async (req, res) => {
  const { email, source } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  try {
    await db.execute(
      'INSERT INTO subscribers (email, source) VALUES (?, ?) ON DUPLICATE KEY UPDATE status="active", source=VALUES(source)',
      [email.toLowerCase().trim(), source || 'website']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/subscribers
adm.get('/', async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const lim = Math.min(parseInt(limit) || 50, 200);
    const off = (Math.max(parseInt(page) || 1, 1) - 1) * lim;
    const conds = [];
    const params = [];
    if (status) { conds.push('status = ?'); params.push(status); }
    if (search) { conds.push('email LIKE ?'); params.push(`%${search}%`); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM subscribers ${where}`, params);
    const [rows] = await db.execute(
      `SELECT id, email, status, source, created_at FROM subscribers ${where} ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`,
      params
    );
    res.json({ data: rows, meta: { total, page: parseInt(page), limit: lim, pages: Math.ceil(total / lim) } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/admin/subscribers/:id
adm.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM subscribers WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/admin/subscribers/:id/status
adm.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active', 'unsubscribed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await db.execute('UPDATE subscribers SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
