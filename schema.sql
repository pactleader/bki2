-- ============================================================
--  The Background Investigator — CMS Database Schema
--  Engine: InnoDB | Charset: utf8mb4_unicode_ci
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  email         VARCHAR(255)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  display_name  VARCHAR(120)    NOT NULL,
  role          ENUM('admin','author') NOT NULL DEFAULT 'author',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CATEGORIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120)    NOT NULL,
  slug          VARCHAR(120)    NOT NULL,
  color_hex     VARCHAR(7)      NOT NULL DEFAULT '#444444',
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  description   TEXT,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ARTICLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  title          VARCHAR(500)    NOT NULL,
  slug           VARCHAR(500)    NOT NULL,
  excerpt        TEXT,
  body           LONGTEXT,
  featured_image VARCHAR(1000),
  author_id      INT UNSIGNED    NOT NULL,
  category_id    INT UNSIGNED    NOT NULL,
  status         ENUM('draft','published') NOT NULL DEFAULT 'draft',
  publish_date   DATETIME,
  view_count     INT UNSIGNED    NOT NULL DEFAULT 0,
  seo_title      VARCHAR(255),
  seo_description VARCHAR(500),
  seo_keywords   VARCHAR(500),
  og_image       VARCHAR(1000),
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_articles_slug (slug),
  KEY idx_articles_status_date (status, publish_date),
  KEY idx_articles_category    (category_id),
  KEY idx_articles_author      (author_id),
  KEY idx_articles_view_count  (view_count),
  FULLTEXT KEY ft_articles_search (title, excerpt),
  CONSTRAINT fk_articles_author   FOREIGN KEY (author_id)   REFERENCES users(id)      ON UPDATE CASCADE,
  CONSTRAINT fk_articles_category FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── EVENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  title         VARCHAR(400)    NOT NULL,
  event_date    VARCHAR(120)    NOT NULL,
  start_date    DATE,
  end_date      DATE,
  location      VARCHAR(300),
  description   TEXT,
  url           VARCHAR(1000),
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_start  (start_date),
  KEY idx_events_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── CONTACT SUBMISSIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name         VARCHAR(255)    NOT NULL,
  email        VARCHAR(255)    NOT NULL,
  subject      VARCHAR(500),
  message      TEXT            NOT NULL,
  is_read      TINYINT(1)      NOT NULL DEFAULT 0,
  ip_address   VARCHAR(45),
  submitted_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contacts_is_read   (is_read),
  KEY idx_contacts_submitted (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── ADS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ads (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255)    NOT NULL,
  image_url     VARCHAR(1000)   NOT NULL,
  link_url      VARCHAR(1000),
  position_slug VARCHAR(80)     NOT NULL,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ads_position_active (position_slug, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── MENU ITEMS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  label         VARCHAR(255)    NOT NULL,
  url           VARCHAR(1000)   NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  parent_id     INT UNSIGNED    DEFAULT NULL,
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  open_in_new   TINYINT(1)      NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_menu_parent (parent_id),
  KEY idx_menu_order  (display_order),
  CONSTRAINT fk_menu_parent FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── HOMEPAGE SECTIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS homepage_sections (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  category_id   INT UNSIGNED    NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  article_count TINYINT UNSIGNED  NOT NULL DEFAULT 4,
  layout        ENUM('grid','featured','style1','style2','style3','style4') NOT NULL DEFAULT 'grid',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_homepage_category (category_id),
  CONSTRAINT fk_homepage_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── SITE SETTINGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key   VARCHAR(120)    NOT NULL,
  setting_value LONGTEXT,
  setting_type  ENUM('string','json','boolean','integer') NOT NULL DEFAULT 'string',
  description   VARCHAR(500),
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET foreign_key_checks = 1;

-- ============================================================
--  SEED DATA
-- ============================================================

-- Default categories (mirrors existing hardcoded data)
INSERT INTO categories (name, slug, color_hex, display_order) VALUES
  ('Top Stories',        'top-stories',        '#c0392b', 1),
  ('International News', 'international-news',  '#1565c0', 2),
  ('National News',      'national-news',       '#0d3b66', 3),
  ('Press Releases',     'press-releases',      '#6a1b9a', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Default events
INSERT INTO events (title, event_date, start_date, end_date, location, description, display_order) VALUES
  ('PBSA Annual Conference 2026',     'September 21–23, 2026', '2026-09-21', '2026-09-23', 'Nashville, TN',  'The Professional Background Screening Association\'s premier annual event.', 1),
  ('SHRM Annual Conference & Expo 2026', 'June 14–17, 2026',  '2026-06-14', '2026-06-17', 'Las Vegas, NV',  'The world\'s largest HR conference.', 2),
  ('Asia Pacific Screening Summit',   'April 8–9, 2026',      '2026-04-08', '2026-04-09', 'Singapore',      'Regional focus on international background screening challenges.', 3),
  ('European Background Screening Forum', 'March 18–19, 2026','2026-03-18', '2026-03-19', 'London, UK',     'Covering GDPR implications, DBS updates, and cross-border screening compliance.', 4)
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Default menu items
INSERT INTO menu_items (label, url, display_order) VALUES
  ('Top Stories',       '/top-stories',       1),
  ('International',     '/international-news', 2),
  ('National News',     '/national-news',      3),
  ('Press Releases',    '/press-releases',     4),
  ('Events',            '/events',             5),
  ('Advertise',         '/advertise',          6),
  ('Contact',           '/contact',            7)
ON DUPLICATE KEY UPDATE label = VALUES(label);

-- Default site settings
INSERT INTO site_settings (setting_key, setting_value, setting_type, description) VALUES
  ('site_name',           'The Background Investigator',                                          'string',  'Site display name'),
  ('site_tagline',        'Background Screening News & Analysis',                                 'string',  'Header tagline'),
  ('site_url',            'https://bki2.pacificpact.com',                                         'string',  'Canonical site URL'),
  ('og_image_default',    '/og-image.svg',                                                        'string',  'Default OpenGraph image'),
  ('phone',               '866-909-6678',                                                         'string',  'Contact phone'),
  ('address',             'PMB 1007 Box 10001, Saipan, MP 96950',                                 'string',  'Office address'),
  ('robots_meta',         'noindex, nofollow',                                                    'string',  'Robots meta tag content'),
  ('most_read_article_ids','[]',                                                                  'json',    'Article IDs for Most Read sidebar (JSON array)'),
  ('highlight_items',     '[]',                                                                   'json',    'Highlight bar items [{label,title,article_id}] (JSON array)'),
  ('footer_privacy_slug',      '',                                                                  'string',  'Slug of the static page used as the Privacy Policy footer link'),
  ('footer_terms_slug',        '',                                                                  'string',  'Slug of the static page used as the Terms footer link'),
  ('cookie_consent_enabled',   '0',                                                                 'boolean', 'Show cookie consent banner on first visit'),
  ('cookie_consent_message',   'We use cookies to improve your experience and analyze site traffic. By clicking "Accept", you consent to our use of cookies.',  'string',  'Cookie banner message text'),
  ('brand_primary_color',      '#1c3362',                                                           'string',  'Primary brand color — used for header, hero, footer backgrounds'),
  ('brand_accent_color',       '#c0392b',                                                           'string',  'Accent brand color — used for links, buttons, category tags'),
  ('logo_url',                 '',                                                                   'string',  'Custom logo image URL — replaces the text logo in the nav bar')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- ─── STATIC PAGES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pages (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  title            VARCHAR(500)  NOT NULL,
  slug             VARCHAR(500)  NOT NULL,
  body             LONGTEXT,
  meta_title       VARCHAR(255),
  meta_description VARCHAR(500),
  is_published     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pages_slug (slug),
  KEY idx_pages_published (is_published)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── REDIRECTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS redirects (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  from_path   VARCHAR(1000) NOT NULL,
  to_url      VARCHAR(1000) NOT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_redirects_from (from_path(255)),
  KEY idx_redirects_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NOTE: Create your first admin user by running this after installing bcryptjs:
--   node server/scripts/create-admin.js
-- Or insert manually with a bcrypt hash (cost 12) for the password.
