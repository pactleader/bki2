const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uniqueSlug }                = require('../utils/slugify');
const { paginate, paginateMeta }    = require('../utils/paginate');

async function getSiteTimezone() {
  try {
    const [[row]] = await db.execute(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'site_timezone' LIMIT 1`
    );
    return row?.setting_value || 'UTC';
  } catch { return 'UTC'; }
}

// Convert a naive datetime string (from datetime-local input) in the site timezone to a UTC MySQL string
function toUTC(naiveDateStr, tz) {
  if (!naiveDateStr) return null;
  const clean = naiveDateStr.replace('T', ' ').replace('Z', '').split('.')[0];
  // Parse as if it's in the given timezone using Intl trick
  // We find what UTC time corresponds to this wall-clock time in tz
  const [datePart, timePart = '00:00:00'] = clean.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second = 0] = timePart.split(':').map(Number);
  // Create a date using the naive values, then figure out the offset
  const naive = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  // Get what this UTC time looks like in the target timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(naive);
  const get = type => parseInt(parts.find(p => p.type === type)?.value || '0');
  const tzY = get('year'), tzM = get('month'), tzD = get('day');
  const tzH = get('hour'), tzMin = get('minute'), tzS = get('second');
  // Offset = naive UTC - what tz says it is
  const tzAsUTC = Date.UTC(tzY, tzM - 1, tzD, tzH === 24 ? 0 : tzH, tzMin, tzS);
  const offsetMs = naive - tzAsUTC;
  const utc = new Date(naive.getTime() + offsetMs);
  return utc.toISOString().replace('T', ' ').slice(0, 19);
}

// Convert a UTC datetime string from DB to site timezone for display (returns ISO-like string)
function fromUTC(utcStr, tz) {
  if (!utcStr) return null;
  const d = new Date(String(utcStr).replace(' ', 'T') + 'Z'); // treat as UTC
  if (isNaN(d)) return utcStr;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value || '00';
  const h = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}:${get('second')}`;
}

const ARTICLE_SELECT = `
  a.id, a.title, a.slug, a.excerpt, a.featured_image, a.featured_image_alt, a.status,
  a.publish_date, a.view_count, a.seo_title, a.seo_description,
  a.seo_keywords, a.og_image, a.schema_json, a.use_slug_only,
  a.source_name, a.source_url, a.created_at, a.updated_at,
  u.id AS author_id, u.display_name AS author_name,
  c.id AS category_id, c.name AS category_name,
  c.slug AS category_slug, c.color_hex AS category_color
`;

function fmt(row) {
  return {
    id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt,
    featured_image: row.featured_image, featured_image_alt: row.featured_image_alt, status: row.status,
    publish_date: row.publish_date, view_count: row.view_count,
    seo_title: row.seo_title, seo_description: row.seo_description,
    seo_keywords: row.seo_keywords, og_image: row.og_image, schema_json: row.schema_json,
    use_slug_only: !!row.use_slug_only,
    source_name: row.source_name, source_url: row.source_url,
    created_at: row.created_at, updated_at: row.updated_at,
    author:   { id: row.author_id,   display_name: row.author_name },
    category: { id: row.category_id, name: row.category_name, slug: row.category_slug, color_hex: row.category_color },
  };
}

// ── PUBLIC ────────────────────────────────────────────────────
const pub = express.Router();

// GET /api/articles
pub.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query);
    const { category, search, has_thumbnail } = req.query;

    const conds = [`a.status = 'published'`, `a.deleted_at IS NULL`, `(a.publish_date IS NULL OR a.publish_date <= NOW())`];
    const params = [];

    if (category)      { conds.push('c.slug = ?'); params.push(category); }
    if (search)        { conds.push('(a.title LIKE ? OR a.excerpt LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (has_thumbnail) { conds.push("a.featured_image IS NOT NULL AND a.featured_image != ''"); }

    const where = 'WHERE ' + conds.join(' AND ');

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM articles a JOIN categories c ON a.category_id = c.id ${where}`, params
    );
    const [rows] = await db.execute(
      `SELECT ${ARTICLE_SELECT} FROM articles a
       JOIN users u ON a.author_id = u.id
       JOIN categories c ON a.category_id = c.id
       ${where} ORDER BY COALESCE(a.publish_date, a.created_at) DESC, a.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows.map(fmt), meta: paginateMeta(total, page, limit) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/articles/slug/:slug
pub.get('/slug/:slug', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ${ARTICLE_SELECT}, a.body FROM articles a
       JOIN users u ON a.author_id = u.id
       JOIN categories c ON a.category_id = c.id
       WHERE a.slug = ? AND a.status = 'published' AND a.deleted_at IS NULL LIMIT 1`,
      [req.params.slug]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await db.execute('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [rows[0].id]);
    res.set('Cache-Control', 'no-store');
    res.json({ ...fmt(rows[0]), body: rows[0].body });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/articles/:id
pub.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ${ARTICLE_SELECT}, a.body FROM articles a
       JOIN users u ON a.author_id = u.id
       JOIN categories c ON a.category_id = c.id
       WHERE a.id = ? AND a.status = 'published' AND a.deleted_at IS NULL LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    await db.execute('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [rows[0].id]);
    res.set('Cache-Control', 'no-store');
    res.json({ ...fmt(rows[0]), body: rows[0].body });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN ─────────────────────────────────────────────────────
const adm = express.Router();
adm.use(verifyToken);

// GET /api/admin/articles
adm.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query);
    const { status, category_id, search, sort } = req.query;

    const conds = ['a.deleted_at IS NULL'];
    const params = [];

    if (req.user.role === 'author') { conds.push('a.author_id = ?'); params.push(req.user.sub); }
    if (status)      { conds.push('a.status = ?');      params.push(status); }
    if (category_id) { conds.push('a.category_id = ?'); params.push(category_id); }
    if (search)      { conds.push('(a.title LIKE ? OR a.excerpt LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';

    const ORDER_BY = {
      recent:   'COALESCE(a.publish_date, a.created_at) DESC, a.created_at DESC',
      views:    'a.view_count DESC, COALESCE(a.publish_date, a.created_at) DESC',
      edited:   'a.updated_at DESC',
    };
    const orderBy = ORDER_BY[sort] || ORDER_BY.recent;

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM articles a
       JOIN users u ON a.author_id = u.id
       JOIN categories c ON a.category_id = c.id
       ${where}`, params
    );
    const [rows] = await db.execute(
      `SELECT ${ARTICLE_SELECT} FROM articles a
       JOIN users u ON a.author_id = u.id
       JOIN categories c ON a.category_id = c.id
       ${where} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ data: rows.map(fmt), meta: paginateMeta(total, page, limit) });
  } catch (err) { console.error('admin articles list error:', err.message, err.sql); res.status(500).json({ error: err.message }); }
});

// GET /api/admin/articles/detail/:id
adm.get('/detail/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ${ARTICLE_SELECT}, a.body FROM articles a
       JOIN users u ON a.author_id = u.id
       JOIN categories c ON a.category_id = c.id
       WHERE a.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'author' && rows[0].author_id !== req.user.sub)
      return res.status(403).json({ error: 'Forbidden' });
    const [extraRows] = await db.execute(
      `SELECT category_id FROM article_categories WHERE article_id = ?`,
      [req.params.id]
    );
    const extra_category_ids = extraRows.map(r => r.category_id);
    res.json({ ...fmt(rows[0]), body: rows[0].body, extra_category_ids });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/admin/articles
adm.post('/', async (req, res) => {
  try {
    const { title, excerpt, body, featured_image, featured_image_alt, category_id, status,
            publish_date, seo_title, seo_description, seo_keywords, og_image, schema_json,
            source_name, source_url, extra_category_ids } = req.body;
    if (!title || !category_id) return res.status(400).json({ error: 'Title and category required' });

    const tz = await getSiteTimezone();
    const slug = await uniqueSlug('articles', title);
    const utcPublishDate = toUTC(publish_date, tz);
    let resolvedStatus = status || 'draft';
    if (resolvedStatus === 'published' && utcPublishDate) {
      const pubMs = new Date(utcPublishDate.replace(' ', 'T') + 'Z').getTime();
      if (pubMs > Date.now()) resolvedStatus = 'scheduled';
    }
    const [result] = await db.execute(
      `INSERT INTO articles
         (title, slug, excerpt, body, featured_image, featured_image_alt, author_id, category_id,
          status, publish_date, seo_title, seo_description, seo_keywords, og_image, schema_json,
          source_name, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, excerpt || null, body || null, featured_image || null,
       featured_image_alt || null,
       req.user.sub, category_id, resolvedStatus,
       utcPublishDate, seo_title || null, seo_description || null,
       seo_keywords || null, og_image || null, schema_json || null,
       source_name || null, source_url || null]
    );
    const articleId = result.insertId;
    await saveExtraCategories(articleId, extra_category_ids, category_id);
    res.status(201).json({ id: articleId, slug });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/admin/articles/:id
adm.put('/:id', async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT author_id, slug, title FROM articles WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Not found' });
    if (req.user.role === 'author' && existing[0].author_id !== req.user.sub)
      return res.status(403).json({ error: 'Forbidden' });

    const { title, excerpt, body, featured_image, featured_image_alt, category_id, author_id, status,
            publish_date, seo_title, seo_description, seo_keywords, og_image, schema_json,
            source_name, source_url, extra_category_ids } = req.body;

    let slug = existing[0].slug;
    if (title && title !== existing[0].title)
      slug = await uniqueSlug('articles', title, parseInt(req.params.id));

    const tz = await getSiteTimezone();
    const resolvedAuthorId = (req.user.role === 'admin' && author_id) ? author_id : existing[0].author_id;
    const utcPublishDate = toUTC(publish_date, tz);
    // If user requests published but date is in the future, save as scheduled instead
    let resolvedStatus = status || 'draft';
    if (resolvedStatus === 'published' && utcPublishDate) {
      const pubMs = new Date(utcPublishDate.replace(' ', 'T') + 'Z').getTime();
      if (pubMs > Date.now()) resolvedStatus = 'scheduled';
    }

    await db.execute(
      `UPDATE articles SET
         title=?, slug=?, excerpt=?, body=?, featured_image=?, featured_image_alt=?,
         category_id=?, author_id=?, status=?, publish_date=?,
         seo_title=?, seo_description=?, seo_keywords=?, og_image=?, schema_json=?,
         source_name=?, source_url=?
       WHERE id=?`,
      [title, slug, excerpt || null, body || null, featured_image || null,
       featured_image_alt || null,
       category_id, resolvedAuthorId, resolvedStatus, utcPublishDate,
       seo_title || null, seo_description || null,
       seo_keywords || null, og_image || null, schema_json || null,
       source_name || null, source_url || null, req.params.id]
    );
    await saveExtraCategories(req.params.id, extra_category_ids, category_id);
    res.json({ ok: true, slug });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message || 'Server error' }); }
});

// POST /api/admin/articles/:id/publish
adm.post('/:id/publish', requireAdmin, async (req, res) => {
  try {
    await db.execute(
      `UPDATE articles SET
         publish_date = IF(publish_date IS NULL, NOW(), publish_date),
         status = IF(publish_date IS NULL OR publish_date <= NOW(), 'published', 'scheduled')
       WHERE id=?`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST /api/admin/articles/:id/unpublish
adm.post('/:id/unpublish', requireAdmin, async (req, res) => {
  try {
    await db.execute(`UPDATE articles SET status='draft' WHERE id=?`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/admin/articles/:id  — soft delete (move to trash)
adm.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE articles SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// GET /api/admin/articles/trash
adm.get('/trash', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT ${ARTICLE_SELECT}, a.deleted_at FROM articles a
       JOIN users u ON a.author_id = u.id
       JOIN categories c ON a.category_id = c.id
       WHERE a.deleted_at IS NOT NULL
       ORDER BY a.deleted_at DESC`
    );
    res.json({ data: rows.map(r => ({ ...fmt(r), deleted_at: r.deleted_at })) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/admin/articles/:id/restore
adm.post('/:id/restore', requireAdmin, async (req, res) => {
  try {
    await db.execute('UPDATE articles SET deleted_at = NULL WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/admin/articles/:id/permanent
adm.delete('/:id/permanent', requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

async function saveExtraCategories(articleId, extraIds, primaryCategoryId) {
  await db.execute('DELETE FROM article_categories WHERE article_id = ?', [articleId]);
  const ids = (Array.isArray(extraIds) ? extraIds : [])
    .map(id => parseInt(id))
    .filter(id => !isNaN(id) && id !== parseInt(primaryCategoryId));
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '(?, ?)').join(', ');
  const values = ids.flatMap(id => [articleId, id]);
  await db.execute(`INSERT INTO article_categories (article_id, category_id) VALUES ${placeholders}`, values);
}

module.exports = { public: pub, admin: adm };
