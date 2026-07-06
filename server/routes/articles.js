const express = require('express');
const db      = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uniqueSlug }                = require('../utils/slugify');
const { paginate, paginateMeta }    = require('../utils/paginate');

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

    const conds = [`a.status = 'published'`];
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
       WHERE a.slug = ? AND a.status = 'published' LIMIT 1`,
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
       WHERE a.id = ? AND a.status = 'published' LIMIT 1`,
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

    const conds = [];
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
    res.json({ ...fmt(rows[0]), body: rows[0].body });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/admin/articles
adm.post('/', async (req, res) => {
  try {
    const { title, excerpt, body, featured_image, featured_image_alt, category_id, status,
            publish_date, seo_title, seo_description, seo_keywords, og_image, schema_json,
            source_name, source_url } = req.body;
    if (!title || !category_id) return res.status(400).json({ error: 'Title and category required' });

    const normalizeDate = d => d ? d.replace('T', ' ').replace('Z', '').split('.')[0] : null;
    const slug = await uniqueSlug('articles', title);
    const [result] = await db.execute(
      `INSERT INTO articles
         (title, slug, excerpt, body, featured_image, featured_image_alt, author_id, category_id,
          status, publish_date, seo_title, seo_description, seo_keywords, og_image, schema_json,
          use_slug_only, source_name, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [title, slug, excerpt || null, body || null, featured_image || null,
       featured_image_alt || null,
       req.user.sub, category_id, status || 'draft',
       normalizeDate(publish_date), seo_title || null, seo_description || null,
       seo_keywords || null, og_image || null, schema_json || null,
       source_name || null, source_url || null]
    );
    res.status(201).json({ id: result.insertId, slug });
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
            source_name, source_url } = req.body;

    let slug = existing[0].slug;
    if (title && title !== existing[0].title)
      slug = await uniqueSlug('articles', title, parseInt(req.params.id));

    const normalizeDate = d => d ? d.replace('T', ' ').replace('Z', '').split('.')[0] : null;

    const resolvedAuthorId = (req.user.role === 'admin' && author_id) ? author_id : existing[0].author_id;

    await db.execute(
      `UPDATE articles SET
         title=?, slug=?, excerpt=?, body=?, featured_image=?, featured_image_alt=?,
         category_id=?, author_id=?, status=?, publish_date=?,
         seo_title=?, seo_description=?, seo_keywords=?, og_image=?, schema_json=?,
         source_name=?, source_url=?
       WHERE id=?`,
      [title, slug, excerpt || null, body || null, featured_image || null,
       featured_image_alt || null,
       category_id, resolvedAuthorId, status || 'draft', normalizeDate(publish_date),
       seo_title || null, seo_description || null,
       seo_keywords || null, og_image || null, schema_json || null,
       source_name || null, source_url || null, req.params.id]
    );
    res.json({ ok: true, slug });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message || 'Server error' }); }
});

// POST /api/admin/articles/:id/publish
adm.post('/:id/publish', requireAdmin, async (req, res) => {
  try {
    await db.execute(
      `UPDATE articles SET status='published', publish_date=IF(publish_date IS NULL, NOW(), publish_date) WHERE id=?`,
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

// DELETE /api/admin/articles/:id
adm.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM articles WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = { public: pub, admin: adm };
