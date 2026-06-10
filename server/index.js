require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const { verifyToken, requireAdmin } = require('./middleware/auth');
const { paginate, paginateMeta }    = require('./utils/paginate');
const { uniqueSlug }                = require('./utils/slugify');
const db                            = require('./db');

const app = express();

// ── Static files ──────────────────────────────────────────────
app.use('/uploads', express.static(require('path').join(__dirname, '../public/uploads')));
// Serve built SPA assets (production only — Nginx handles this in prod, but fallback here)
app.use(express.static(require('path').join(__dirname, '../dist'), { index: false }));

// ── Security ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '400mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Route files ───────────────────────────────────────────────
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/articles',         require('./routes/articles').public);
app.use('/api/admin/articles',   require('./routes/articles').admin);
app.use('/api/categories',       require('./routes/categories').public);
app.use('/api/admin/categories', require('./routes/categories').admin);
app.use('/api/contacts',         require('./routes/contacts').public);
app.use('/api/admin/contacts',   require('./routes/contacts').admin);
app.use('/api/ads',              require('./routes/ads').public);
app.use('/api/admin/ads',        require('./routes/ads').admin);
app.use('/api/menu',             require('./routes/menu').public);
app.use('/api/admin/menu',       require('./routes/menu').admin);
app.use('/api/events',           require('./routes/events').public);
app.use('/api/admin/events',     require('./routes/events').admin);
app.use('/api/settings',         require('./routes/settings').public);
app.use('/api/admin/settings',   require('./routes/settings').admin);
app.use('/api/homepage',         require('./routes/homepage').public);
app.use('/api/admin/homepage',   require('./routes/homepage').admin);
app.use('/api/admin/users',      require('./routes/users'));
app.use('/api/admin/upload',     require('./routes/upload'));
app.use('/api/admin/media',      require('./routes/media'));
app.use('/api/admin/import',          require('./routes/import'));
app.use('/api/admin/generate-image',  require('./routes/generate-image'));
app.use('/api/admin/redirects',       require('./routes/redirects').admin);
app.use('/api/pages',                 require('./routes/pages').public);
app.use('/api/admin/pages',           require('./routes/pages').admin);
app.use('/api/subscribe',        require('./routes/subscribers').public);
app.use('/api/admin/subscribers',require('./routes/subscribers').admin);

// ── 301 Redirects — must come before SSR and SPA fallback ────
app.use(require('./routes/redirects').public);

// ── Article SSR ───────────────────────────────────────────────
app.use('/Articles', require('./routes/ssr'));

// ── Static page SSR ───────────────────────────────────────────
app.use('/p', require('./routes/pages-ssr'));

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ── SPA fallback for client-side routes ──────────────────────
const SPA = require('path').join(__dirname, '../dist/index.html');
app.get('/p/*', (req, res) => res.sendFile(SPA));

// ── SPA fallback — serve index.html for client-side routes ───
app.get('/search', (req, res) => {
  res.sendFile(require('path').join(__dirname, '../dist/index.html'));
});

// ── 404 / Error ───────────────────────────────────────────────
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '4000');
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`BKI API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
server.timeout = 120000;        // 2 min — covers slow AI image generation
server.keepAliveTimeout = 120000;
