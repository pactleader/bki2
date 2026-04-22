const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const PUBLIC_KEYS = ['site_name', 'site_tagline', 'site_url', 'og_image_default', 'phone', 'address', 'robots_meta', 'custom_head_scripts', 'custom_body_scripts', 'custom_footer_scripts'];

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

pub.get('/', async (req, res) => {
  try {
    const placeholders = PUBLIC_KEYS.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT setting_key, setting_value, setting_type FROM site_settings WHERE setting_key IN (${placeholders})`,
      PUBLIC_KEYS
    );
    const result = {};
    rows.forEach(r => {
      result[r.setting_key] = r.setting_type === 'json' ? JSON.parse(r.setting_value || '{}') : r.setting_value;
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN ─────────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken, requireAdmin);

adm.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM site_settings ORDER BY setting_key ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

adm.put('/', async (req, res) => {
  try {
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Array required' });
    for (const item of items)
      await db.execute(
        'INSERT INTO site_settings (setting_key, setting_value, setting_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), setting_type=VALUES(setting_type)',
        [item.key, item.value, item.type || 'string']
      );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

adm.put('/:key', async (req, res) => {
  try {
    const { value, type } = req.body;
    await db.execute(
      'INSERT INTO site_settings (setting_key, setting_value, setting_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), setting_type=VALUES(setting_type)',
      [req.params.key, value, type || 'string']
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
