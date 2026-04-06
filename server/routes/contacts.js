const express   = require('express');
const rateLimit = require('express-rate-limit');
const db        = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { paginate, paginateMeta }    = require('../utils/paginate');

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

const submitLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/contacts
pub.post('/', submitLimit, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ error: 'Name, email and message are required' });
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    await db.execute(
      'INSERT INTO contacts (name, email, subject, message, ip_address) VALUES (?, ?, ?, ?, ?)',
      [name, email, subject || null, message, ip]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ADMIN ─────────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

// GET /api/admin/contacts
adm.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query);
    const { is_read } = req.query;

    let where = '';
    const params = [];
    if (is_read !== undefined && is_read !== '') {
      where = 'WHERE is_read = ?';
      params.push(parseInt(is_read));
    }

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM contacts ${where}`, params
    );
    const [rows] = await db.execute(
      `SELECT id, name, email, subject, is_read, submitted_at FROM contacts ${where}
       ORDER BY submitted_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows, meta: paginateMeta(total, page, limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/contacts/:id
adm.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM contacts WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    if (!rows[0].is_read)
      await db.execute('UPDATE contacts SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ ...rows[0], is_read: 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/contacts/:id/read
adm.put('/:id/read', async (req, res) => {
  try {
    const { is_read } = req.body;
    await db.execute('UPDATE contacts SET is_read = ? WHERE id = ?', [is_read ? 1 : 0, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/contacts/:id
adm.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM contacts WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { public: pub, admin: adm };
