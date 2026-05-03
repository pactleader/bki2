const express   = require('express');
const multer    = require('multer');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { slugify } = require('../utils/slugify');
const db        = require('../db');

const router = express.Router();
router.use(verifyToken);
router.use(requireAdmin);

// Store SQL in memory only — no disk write needed
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ── Category map (old blog_cat ID → new category slug) ───────
// Keys are old blog_categories.blog_uid values found in the SQL dump.
// Values are slugs that must exist in the new `categories` table.
const DEFAULT_CAT_MAP = {
  26: 'international-news',
  30: 'national-news',
  31: 'press-releases',
  32: 'top-stories',
};

// ── SQL parser ────────────────────────────────────────────────

function parseBlogCategories(sql) {
  const cats = {};
  // Match INSERT rows for blog_categories
  const blockRx = /INSERT INTO `blog_categories`[^;]+;/gis;
  const rowRx   = /\((\d+),\s*'([^']+)',\s*(\d+)\)/g;
  let block;
  while ((block = blockRx.exec(sql)) !== null) {
    let row;
    while ((row = rowRx.exec(block[0])) !== null) {
      cats[row[1]] = row[2]; // id → name
    }
  }
  return cats;
}

function parseBlogPosts(sql) {
  const posts = [];

  // Find all INSERT blocks for blog_post
  const blockRx = /INSERT INTO `blog_post`\s*\([^)]+\)\s*VALUES\s*([\s\S]+?);(?=\s*(?:INSERT|--|\/\*|$))/gi;

  let block;
  while ((block = blockRx.exec(sql)) !== null) {
    const valueSection = block[1];

    // Split into individual rows — each starts with '(' and ends with '),'  or ');\n'
    // We walk char-by-char to handle nested parens and escaped quotes
    const rows = splitValueRows(valueSection);

    for (const row of rows) {
      const parsed = parseValueRow(row);
      if (parsed) posts.push(parsed);
    }
  }
  return posts;
}

function splitValueRows(valueSection) {
  const rows = [];
  let depth = 0;
  let inStr = false;
  let escape = false;
  let start = -1;

  for (let i = 0; i < valueSection.length; i++) {
    const ch = valueSection[i];

    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }

    if (ch === "'" && !escape) { inStr = !inStr; continue; }
    if (inStr) continue;

    if (ch === '(') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0 && start !== -1) {
        rows.push(valueSection.slice(start + 1, i));
        start = -1;
      }
    }
  }
  return rows;
}

function parseValueRow(row) {
  // Tokenise the row into SQL value tokens respecting strings
  const tokens = tokenise(row);
  if (tokens.length < 15) return null; // blog_post has 15 columns

  // Column order from dump:
  // 0: blog_uid, 1: blog_type, 2: blog_title, 3: blog_last_edited,
  // 4: blog_status, 5: blog_keywords, 6: blog_description, 7: blog_content,
  // 8: blog_draftof_blog_id, 9: blog_updated_id, 10: blog_is_secure,
  // 11: blog_social_options, 12: blog_datetime_start, 13: blog_cat,
  // 14: blog_show_home
  return {
    uid:          parseInt(tokens[0]),
    type:         unquote(tokens[1]),
    title:        unquote(tokens[2]),
    last_edited:  unquote(tokens[3]),
    status:       parseInt(tokens[4]),
    keywords:     unquote(tokens[5]),
    description:  unquote(tokens[6]),
    content:      unquote(tokens[7]),
    draft_of:     tokens[8] === 'NULL' ? null : parseInt(tokens[8]),
    updated_id:   tokens[9] === 'NULL' ? null : parseInt(tokens[9]),
    is_secure:    parseInt(tokens[10]),
    social:       unquote(tokens[11]),
    date_start:   unquote(tokens[12]),
    cat:          parseInt(tokens[13]),
    show_home:    parseInt(tokens[14]),
  };
}

function tokenise(row) {
  const tokens = [];
  let i = 0;
  while (i < row.length) {
    // Skip whitespace/comma between tokens
    while (i < row.length && /[\s,]/.test(row[i])) i++;
    if (i >= row.length) break;

    if (row[i] === "'") {
      // String token — collect until closing unescaped quote
      let str = "'";
      i++;
      while (i < row.length) {
        if (row[i] === '\\') {
          str += row[i] + (row[i + 1] || '');
          i += 2;
        } else if (row[i] === "'") {
          str += "'";
          i++;
          break;
        } else {
          str += row[i++];
        }
      }
      tokens.push(str);
    } else {
      // Bare token (number, NULL, etc.)
      let tok = '';
      while (i < row.length && !/[\s,]/.test(row[i])) tok += row[i++];
      tokens.push(tok);
    }
  }
  return tokens;
}

function unquote(tok) {
  if (!tok || tok === 'NULL') return null;
  if (tok.startsWith("'") && tok.endsWith("'")) {
    return tok.slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');
  }
  return tok;
}

// ── POST /api/admin/import/preview ───────────────────────────
router.post('/preview', upload.single('sql'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const sql = req.file.buffer.toString('utf8');

    const oldCats  = parseBlogCategories(sql);
    const posts    = parseBlogPosts(sql);

    // Fetch current categories from new DB
    const [newCats] = await db.execute('SELECT id, name, slug FROM categories');
    const catSlugToId = {};
    newCats.forEach(c => { catSlugToId[c.slug] = c.id; });

    // Check which old cat IDs we can map
    const catMapping = {}; // old cat id → { slug, newId, name, mapped }
    for (const [oldId, oldName] of Object.entries(oldCats)) {
      const slug  = DEFAULT_CAT_MAP[oldId];
      const newId = slug ? catSlugToId[slug] : null;
      catMapping[oldId] = { oldName, slug: slug || null, newId: newId || null, mapped: !!newId };
    }

    // Also catch cats referenced in posts but not in blog_categories table
    for (const p of posts) {
      if (!catMapping[p.cat]) {
        catMapping[p.cat] = { oldName: `Unknown (id ${p.cat})`, slug: null, newId: null, mapped: false };
      }
    }

    // Check which post IDs already exist in articles
    const existingIds = new Set();
    if (posts.length > 0) {
      const ids = posts.map(p => p.uid);
      // MySQL IN clause with placeholders
      const placeholders = ids.map(() => '?').join(',');
      const [existing] = await db.execute(
        `SELECT id FROM articles WHERE id IN (${placeholders})`, ids
      );
      existing.forEach(r => existingIds.add(r.id));
    }

    const publishedPosts = posts.filter(p => p.status === 1 && p.type === 'content');
    const importable = publishedPosts.filter(p => {
      const cm = catMapping[p.cat];
      return cm?.mapped && !existingIds.has(p.uid);
    });

    const skippedDupe   = publishedPosts.filter(p => existingIds.has(p.uid));
    const skippedNoCat  = publishedPosts.filter(p => {
      const cm = catMapping[p.cat];
      return !cm?.mapped && !existingIds.has(p.uid);
    });
    const skippedDraft  = posts.filter(p => p.status !== 1 || p.type !== 'content');

    res.json({
      total_in_file:   posts.length,
      published:       publishedPosts.length,
      importable:      importable.length,
      skipped_dupe:    skippedDupe.length,
      skipped_no_cat:  skippedNoCat.length,
      skipped_draft:   skippedDraft.length,
      category_map:    catMapping,
      new_categories:  newCats,
      sample:          importable.slice(0, 5).map(p => ({
        uid: p.uid, title: p.title, date: p.date_start, cat: p.cat,
      })),
      // Pass serialised posts back so the run step doesn't need to re-upload
      _posts: posts,
    });
  } catch (err) {
    console.error('import preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/import/run ────────────────────────────────
router.post('/run', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { posts, cat_map_override } = req.body;
    // cat_map_override: { [oldCatId]: newCategoryId }  — from the UI

    if (!Array.isArray(posts) || posts.length === 0)
      return res.status(400).json({ error: 'No posts provided' });

    // Fetch author id (use first admin user)
    const [[adminUser]] = await db.execute(
      `SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1`
    );
    if (!adminUser) return res.status(400).json({ error: 'No admin user found in database' });
    const authorId = adminUser.id;

    // Fetch existing article ids to skip dupes
    const incomingIds = posts.map(p => p.uid);
    const placeholders = incomingIds.map(() => '?').join(',');
    const [existingRows] = await db.execute(
      `SELECT id FROM articles WHERE id IN (${placeholders})`, incomingIds
    );
    const existingIds = new Set(existingRows.map(r => r.id));

    // Build final category map
    const catMap = { ...DEFAULT_CAT_MAP_IDS };
    if (cat_map_override) Object.assign(catMap, cat_map_override);

    // Fetch categories for slug → id resolution
    const [cats] = await db.execute('SELECT id, slug FROM categories');
    const slugToId = {};
    cats.forEach(c => { slugToId[c.slug] = c.id; });

    // Also resolve slug-based DEFAULT_CAT_MAP to IDs
    for (const [oldId, slug] of Object.entries(DEFAULT_CAT_MAP)) {
      if (slugToId[slug]) catMap[oldId] = slugToId[slug];
    }

    let skipped = 0;
    const errors = [];
    const rows   = [];  // rows to batch-insert
    const params = [];

    // Build used-slugs set to deduplicate within this batch
    const [existingSlugs] = await db.execute('SELECT slug FROM articles');
    const usedSlugs = new Set(existingSlugs.map(r => r.slug));

    for (const p of posts) {
      if (p.status !== 1 || p.type !== 'content') { skipped++; continue; }
      if (existingIds.has(p.uid))                 { skipped++; continue; }

      const catId = catMap[p.cat];
      if (!catId) { skipped++; continue; }

      // Generate unique slug within existing + this batch
      let slug = slugify(p.title || `post-${p.uid}`) || `post-${p.uid}`;
      let candidate = slug;
      let counter = 1;
      while (usedSlugs.has(candidate)) candidate = `${slug}-${counter++}`;
      usedSlugs.add(candidate);

      const seoKeywords    = p.keywords    === 'None' ? null : (p.keywords    || null);
      const seoDescription = p.description === 'None' ? null : (p.description || null);
      const publishDate    = p.date_start  || null;
      const editedDate     = p.last_edited || publishDate || new Date().toISOString().slice(0, 10);

      rows.push('(?, ?, ?, ?, ?, ?, ?, \'published\', ?, ?, ?, ?, ?)');
      params.push(
        p.uid, (p.title || '').trim(), candidate, p.content || '',
        seoDescription, authorId, catId,
        publishDate, seoKeywords, seoDescription,
        editedDate, editedDate
      );
    }

    // Single batched INSERT — much faster, avoids gateway timeout
    if (rows.length > 0) {
      try {
        await db.execute(
          `INSERT INTO articles
             (id, title, slug, body, excerpt, author_id, category_id,
              status, publish_date, seo_keywords, seo_description, created_at, updated_at)
           VALUES ${rows.join(',')}`,
          params
        );
      } catch (insertErr) {
        // Batch failed — fall back to one-by-one so we can identify which rows error
        for (let i = 0; i < rows.length; i++) {
          const rowParams = params.slice(i * 13, i * 13 + 13);
          try {
            await db.execute(
              `INSERT INTO articles
                 (id, title, slug, body, excerpt, author_id, category_id,
                  status, publish_date, seo_keywords, seo_description, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?, ?)`,
              rowParams
            );
          } catch (e) {
            errors.push({ uid: rowParams[0], title: rowParams[1], error: e.message });
            skipped++;
          }
        }
      }
    }

    const imported = rows.length - errors.length;

    // Reset AUTO_INCREMENT above highest imported id
    const [[maxRow]] = await db.execute('SELECT MAX(id) AS mx FROM articles');
    if (maxRow?.mx) {
      await db.execute(`ALTER TABLE articles AUTO_INCREMENT = ?`, [maxRow.mx + 1]);
    }

    res.json({ imported, skipped, errors });
  } catch (err) {
    console.error('import run error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Pre-resolved slug → id version used in /run
const DEFAULT_CAT_MAP_IDS = {}; // populated at runtime from DB via slugs

module.exports = router;
