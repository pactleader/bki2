const db = require('../db');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(table, base, excludeId = null) {
  let slug = slugify(base);
  let counter = 0;
  while (true) {
    const candidate = counter === 0 ? slug : `${slug}-${counter}`;
    const query = excludeId
      ? `SELECT id FROM ${table} WHERE slug = ? AND id != ? LIMIT 1`
      : `SELECT id FROM ${table} WHERE slug = ? LIMIT 1`;
    const params = excludeId ? [candidate, excludeId] : [candidate];
    const [rows] = await db.execute(query, params);
    if (rows.length === 0) return candidate;
    counter++;
  }
}

module.exports = { slugify, uniqueSlug };
