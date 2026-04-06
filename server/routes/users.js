const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All user routes require admin
router.use(verifyToken, requireAdmin);

// GET /api/admin/users
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, email, display_name, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, email, display_name, role, is_active, created_at FROM users WHERE id=? LIMIT 1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users
router.post('/', async (req, res) => {
  try {
    const { email, password, display_name, role } = req.body;
    if (!email || !password || !display_name) {
      return res.status(400).json({ error: 'Email, password and display name required' });
    }
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
      [email.toLowerCase().trim(), hash, display_name, role || 'author']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { email, password, display_name, role, is_active } = req.body;
    const fields = [];
    const params = [];

    if (email)        { fields.push('email=?');        params.push(email.toLowerCase().trim()); }
    if (display_name) { fields.push('display_name=?'); params.push(display_name); }
    if (role)         { fields.push('role=?');          params.push(role); }
    if (is_active !== undefined) { fields.push('is_active=?'); params.push(is_active ? 1 : 0); }
    if (password)     {
      const hash = await bcrypt.hash(password, 12);
      fields.push('password_hash=?');
      params.push(hash);
    }

    if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);

    await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, params);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id  (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.sub) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }
    await db.execute('UPDATE users SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
