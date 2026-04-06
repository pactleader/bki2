function paginate(query) {
  const page   = Math.max(1, parseInt(query.page  || '1', 10));
  const limit  = Math.min(100, Math.max(1, parseInt(query.limit || '12', 10)));
  const offset = (page - 1) * limit;
  // Return plain integers — interpolate into SQL strings directly (LIMIT ${limit})
  // because some MySQL versions reject prepared statement placeholders for LIMIT/OFFSET
  return { page, limit, offset };
}

function paginateMeta(total, page, limit) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}

module.exports = { paginate, paginateMeta };
