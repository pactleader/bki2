const BASE = '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const getHomepage   = (seenIds=[]) => get(`/homepage${seenIds.length ? '?seen=' + seenIds.join(',') : ''}`);
export const getMostRead   = ()           => get('/homepage/most-read');
export const getArticles   = (params)     => get(`/articles?${new URLSearchParams(params).toString()}`);
export const getArticle    = (id)         => get(`/articles/${id}`);
export const getArticleBySlug = (slug)    => get(`/articles/slug/${slug}`);
export const getCategory   = (slug, page) => get(`/articles?category=${slug}&page=${page || 1}&limit=12`);
export const getCategories = ()           => get('/categories');
export const getEvents     = ()           => get('/events');
export const getAds        = (position)   => get(`/ads?position=${position}`);
export const getMenu       = ()           => get('/menu');
export const getSettings   = ()           => get('/settings');

export async function subscribe(email, source = 'website') {
  const res = await fetch(`${BASE}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, source }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Subscription failed');
  return data;
}

export async function submitContact(payload) {
  const res = await fetch(`${BASE}/contacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to send message');
  }
  return res.json();
}
