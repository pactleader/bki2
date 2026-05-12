import { getToken, logout } from './auth.js';

const BASE = '/api';

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });

  const data = await res.json().catch(() => null);
  if (res.status === 401) {
    if (!path.includes('/auth/login')) {
      logout();
      window.location.href = '/admin/login';
      return;
    }
  }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────
export const login  = (email, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe  = () => apiFetch('/auth/me');
export const apiLogout = () => apiFetch('/auth/logout', { method: 'POST' });

// ── Articles ──────────────────────────────────────────────────
export const listArticles   = (params = {}) => apiFetch('/admin/articles?' + new URLSearchParams(params));
export const getArticle     = (id) => apiFetch(`/admin/articles/detail/${id}`);
export const createArticle  = (data) => apiFetch('/admin/articles', { method: 'POST', body: JSON.stringify(data) });
export const updateArticle  = (id, data) => apiFetch(`/admin/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteArticle  = (id) => apiFetch(`/admin/articles/${id}`, { method: 'DELETE' });
export const publishArticle = (id) => apiFetch(`/admin/articles/${id}/publish`, { method: 'POST' });
export const unpublishArticle = (id) => apiFetch(`/admin/articles/${id}/unpublish`, { method: 'POST' });

// ── Categories ────────────────────────────────────────────────
export const listCategories  = () => apiFetch('/categories');
export const createCategory  = (data) => apiFetch('/admin/categories', { method: 'POST', body: JSON.stringify(data) });
export const updateCategory  = (id, data) => apiFetch(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCategory  = (id) => apiFetch(`/admin/categories/${id}`, { method: 'DELETE' });
export const reorderCategories = (items) => apiFetch('/admin/categories/reorder', { method: 'PUT', body: JSON.stringify(items) });

// ── Users ─────────────────────────────────────────────────────
export const listUsers   = () => apiFetch('/admin/users');
export const getUser     = (id) => apiFetch(`/admin/users/${id}`);
export const createUser  = (data) => apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser  = (id, data) => apiFetch(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser  = (id) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' });

// ── Contacts ──────────────────────────────────────────────────
export const listContacts  = (params = {}) => apiFetch('/admin/contacts?' + new URLSearchParams(params));
export const getContact    = (id) => apiFetch(`/admin/contacts/${id}`);
export const markRead      = (id, is_read) => apiFetch(`/admin/contacts/${id}/read`, { method: 'PUT', body: JSON.stringify({ is_read }) });
export const deleteContact = (id) => apiFetch(`/admin/contacts/${id}`, { method: 'DELETE' });

// ── Ads ───────────────────────────────────────────────────────
export const listAds   = () => apiFetch('/admin/ads');
export const createAd  = (data) => apiFetch('/admin/ads', { method: 'POST', body: JSON.stringify(data) });
export const updateAd  = (id, data) => apiFetch(`/admin/ads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const toggleAd  = (id) => apiFetch(`/admin/ads/${id}/toggle`, { method: 'PUT' });
export const deleteAd  = (id) => apiFetch(`/admin/ads/${id}`, { method: 'DELETE' });

// ── Menu ──────────────────────────────────────────────────────
export const listMenu    = () => apiFetch('/admin/menu');
export const createMenuItem = (data) => apiFetch('/admin/menu', { method: 'POST', body: JSON.stringify(data) });
export const updateMenuItem = (id, data) => apiFetch(`/admin/menu/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteMenuItem = (id) => apiFetch(`/admin/menu/${id}`, { method: 'DELETE' });
export const reorderMenu = (items) => apiFetch('/admin/menu/reorder', { method: 'PUT', body: JSON.stringify(items) });

// ── Events ────────────────────────────────────────────────────
export const listEvents   = () => apiFetch('/admin/events');
export const createEvent  = (data) => apiFetch('/admin/events', { method: 'POST', body: JSON.stringify(data) });
export const updateEvent  = (id, data) => apiFetch(`/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const toggleEvent  = (id) => apiFetch(`/admin/events/${id}/toggle`, { method: 'PUT' });
export const deleteEvent  = (id) => apiFetch(`/admin/events/${id}`, { method: 'DELETE' });

// ── Homepage ──────────────────────────────────────────────────
export const listHomepageSections  = () => apiFetch('/admin/homepage');
export const createHomepageSection = (data) => apiFetch('/admin/homepage', { method: 'POST', body: JSON.stringify(data) });
export const updateHomepageSection = (id, data) => apiFetch(`/admin/homepage/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteHomepageSection = (id) => apiFetch(`/admin/homepage/${id}`, { method: 'DELETE' });
export const reorderHomepage = (items) => apiFetch('/admin/homepage/reorder', { method: 'PUT', body: JSON.stringify(items) });

// ── Settings ──────────────────────────────────────────────────
export const listSettings   = () => apiFetch('/admin/settings');
export const saveSettings   = (items) => apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(items) });
export const saveSetting    = (key, value, type) => apiFetch(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value, type }) });

// ── Media ─────────────────────────────────────────────────────
export const listMedia   = () => apiFetch('/admin/media');
export const deleteMedia = (filename) => apiFetch(`/admin/media/${encodeURIComponent(filename)}`, { method: 'DELETE' });

// ── AI Image Generation ───────────────────────────────────────
export const generateImage = (prompt, provider = 'openai') =>
  apiFetch('/admin/generate-image', { method: 'POST', body: JSON.stringify({ prompt, provider }) });

// ── Import ────────────────────────────────────────────────────
export function importPreview(file) {
  const token = getToken();
  const fd = new FormData();
  fd.append('sql', file);
  return fetch(`${BASE}/admin/import/preview`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  }).then(async r => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  });
}
export const importRun = (posts, cat_map_override) =>
  apiFetch('/admin/import/run', { method: 'POST', body: JSON.stringify({ posts, cat_map_override }) });

// ── Redirects ─────────────────────────────────────────────────
export const listRedirects   = () => apiFetch('/admin/redirects');
export const createRedirect  = (data) => apiFetch('/admin/redirects', { method: 'POST', body: JSON.stringify(data) });
export const updateRedirect  = (id, data) => apiFetch(`/admin/redirects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRedirect  = (id) => apiFetch(`/admin/redirects/${id}`, { method: 'DELETE' });

// ── Subscribers ───────────────────────────────────────────────
export const listSubscribers        = (params = {}) => apiFetch('/admin/subscribers?' + new URLSearchParams(params));
export const deleteSubscriber       = (id) => apiFetch(`/admin/subscribers/${id}`, { method: 'DELETE' });
export const updateSubscriberStatus = (id, status) => apiFetch(`/admin/subscribers/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
