import { useState, useEffect, useRef, useCallback } from "react";
import { getHomepage, getMostRead, getArticle, getArticles, getCategory, getEvents, getAds, subscribe, submitContact, getSettings } from "./api.js";

// ─── DATA ────────────────────────────────────────────────
const ARTICLES = {
  topStories: [
    { id: 3186, title: 'The Black Box of Guam: Why "Airtight Logic" is Your Only Shield in a Public-Access Vacuum', author: 'Steve Brownstein', date: 'February 09, 2026', excerpt: 'In the world of background screening, we chase facts. We live by the mantra of "maximum possible accuracy," a standard carved into law by the FCRA. But what happens when the very courts we rely on become a black box—a place where data goes in, results come out, but the crucial matching logic remains hidden?', category: 'Top Stories' },
    { id: 3185, title: 'The Architecture of Justice: Understanding the Systematic Lifecycle of Court Records', author: 'Steve Brownstein', date: 'February 06, 2026', excerpt: 'For background screening professionals, the "court record" is our primary unit of currency. However, a record is not merely a static document; it is a component of a highly structured, chronological system designed to track, manage, and adjudicate legal proceedings.', category: 'Top Stories' },
    { id: 3184, title: 'DHS is Circumventing Constitution by Buying Data It Would Normally Need a Warrant to Access', author: 'Editorial Staff', date: 'February 05, 2026', excerpt: 'The Fourth Amendment generally requires the government to get a warrant before searching your private information, but government agencies are circumventing the intent of the Constitution by simply purchasing the data from commercial brokers.', category: 'Top Stories' },
    { id: 3179, title: 'The Why of London Searches', author: 'Steve Brownstein', date: 'January 29, 2026', excerpt: 'Clarification on London Jurisdictional Searches — why we conducted searches at both the Magistrates and Crown Courts for the single address provided, and what jurisdictional nuances every screening professional should know.', category: 'Top Stories' },
    { id: 3176, title: 'Seoul South Korea — What are the District Courts and Which Communities Do They Serve', author: 'Editorial Staff', date: 'January 26, 2026', excerpt: 'In Seoul, South Korea, the judiciary includes several district courts that serve different areas within the city and surrounding regions. Each district court handles a range of civil, criminal, and administrative matters.', category: 'Top Stories' },
    { id: 3175, title: 'Understanding Summary vs. Indictable Offenses — CANADA', author: 'Editorial Staff', date: 'January 24, 2026', excerpt: 'A Practical Guide to Offense Types, Convictions, and Hybrid Cases for background screening professionals working with Canadian criminal records.', category: 'Top Stories' },
  ],
  internationalNews: [
    { id: 3183, title: "Ontario's New Online Link to the Criminal Courts Portal is Delayed until 2030", author: 'Editorial Staff', date: 'February 04, 2026', excerpt: "A new online portal meant to streamline access to Ontario's court system is leaving some lawyers grappling with unpredictable delays and facing new hurdles in managing their cases.", category: 'International News' },
    { id: 3182, title: 'England/Wales — DBS Searches Delayed', author: 'Editorial Staff', date: 'February 03, 2026', excerpt: 'As of late 2025 and early 2026, Enhanced DBS checks are experiencing delays, with some applications taking over 60–100 days to complete, particularly affecting sectors like education and healthcare.', category: 'International News' },
    { id: 3181, title: 'England — Non-party Access to Documents Used in Civil Court Proceedings', author: 'Editorial Staff', date: 'February 01, 2026', excerpt: 'Under Practice Direction 51ZH, the new HMCTS Pilot Scheme, alternatively named the "Access to Public Documents Pilot" came into effect for a two-year period.', category: 'International News' },
    { id: 3180, title: 'Canada — When it Comes to Records, Justice is Blind', author: 'Editorial Staff', date: 'January 30, 2026', excerpt: "For lawyer Tavengwa Runyowa, the judge's decision was groundbreaking. He believed it would almost certainly become an important precedent in other police misconduct cases.", category: 'International News' },
  ],
  nationalNews: [
    { id: 3177, title: 'What Happened to the Los Angeles County Municipal Courts — and Where They Are Now', author: 'Steven Brownstein', date: 'January 27, 2026', excerpt: 'A Brief History: The Rise of Municipal Courts in Los Angeles County — understanding the consolidation and its implications for background screening professionals searching for historical records.', category: 'National News' },
    { id: 3161, title: 'Ethics, Risks, and Liability of the Record Retriever', author: 'Steve Brownstein', date: 'January 15, 2026', excerpt: 'If your record provider is giving you "compliance advice" on what you should or shouldn\'t report, you aren\'t just getting a tip—you might be opening a massive legal liability.', category: 'National News' },
    { id: 3156, title: 'Schedule III Marijuana: The DOT and Federal Testing Dilemma', author: 'Editorial Staff', date: 'January 10, 2026', excerpt: 'On December 18, 2025, an Executive Order directed the DOJ to expedite the rescheduling of marijuana to Schedule III. While this has created significant questions for DOT and federal testing protocols.', category: 'National News' },
  ],
  pressReleases: [
    { id: 3163, title: 'Why Social Media Screening is a Compliance Trap (Unless You Have a Safety Net)', author: 'Editorial Staff', date: 'January 18, 2026', excerpt: 'Adverse Social Media searches are the "new shiny object" in our industry. They are fast, AI-driven, and promise deeper insight into candidates. But without proper safeguards, they can become a compliance nightmare.', category: 'Press Releases' },
    { id: 3136, title: 'Straightline International Announces Significant Upgrade to Cayman Islands Services', author: 'Straightline International', date: 'December 20, 2025', excerpt: 'HUGE news for global background screening! Straightline International is proud to announce a significant upgrade to our Cayman Islands Services following productive meetings with local officials.', category: 'Press Releases' },
    { id: 3114, title: 'Straightline International Sets the Record Straight: The Original Criminal Record Provider', author: 'Straightline International', date: 'December 01, 2025', excerpt: 'Straightline International is not a CRA. We are what PBSA defines as a Criminal Record Provider — and in fact, we are the original. Our role in the pre-employment screening ecosystem is unique.', category: 'Press Releases' },
  ],
};

const EVENTS = [
  { title: 'PBSA Annual Conference 2026', date: 'September 21–23, 2026', location: 'Nashville, TN', description: "The Professional Background Screening Association's premier annual event." },
  { title: 'SHRM Annual Conference & Expo 2026', date: 'June 14–17, 2026', location: 'Las Vegas, NV', description: "The world's largest HR conference." },
  { title: 'Asia Pacific Screening Summit', date: 'April 8–9, 2026', location: 'Singapore', description: 'Regional focus on international background screening challenges.' },
  { title: 'European Background Screening Forum', date: 'March 18–19, 2026', location: 'London, UK', description: 'Covering GDPR implications, DBS updates, and cross-border screening compliance.' },
];

const ALL_ARTICLES = [
  ...ARTICLES.topStories,
  ...ARTICLES.internationalNews,
  ...ARTICLES.nationalNews,
  ...ARTICLES.pressReleases,
];



const CAT_COLORS = {
  'Top Stories': '#c0392b',
  'International News': '#1565c0',
  'National News': '#0d3b66',
  'Press Releases': '#6a1b9a',
};

const HIGHLIGHTS = [
  { label: 'Opinion', title: 'Why Background Screening is the Hidden Backbone of Global HR', id: 3186 },
  { label: 'Feature', title: 'Inside the Courts: A Day with a Record Retriever', id: 3161 },
  { label: 'Culture', title: 'How APAC Markets are Reshaping Screening Standards', id: 3183 },
  { label: 'Analysis', title: 'FCRA Compliance in 2026: What Changed and What Didn\'t', id: 3184 },
];

// ─── HOOKS ───────────────────────────────────────────────

const SITE_NAME = 'The Background Investigator';
const SITE_URL = 'https://bki2.pacificpact.com';
const DEFAULT_DESC = 'Your information resource for the background investigation industry. News, court record updates, and compliance analysis for pre-employment screening professionals.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.svg`;

function useMeta({ title, description, image, url, type = 'website' }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Background Screening News & Analysis`;
    const desc = description || DEFAULT_DESC;
    const img = image || DEFAULT_IMAGE;
    const pageUrl = url || SITE_URL;

    document.title = fullTitle;

    const setMeta = (attr, key, value) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', value);
    };

    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:image', img);
    setMeta('property', 'og:url', pageUrl);
    setMeta('property', 'og:type', type);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', img);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', pageUrl);
  }, [title, description, image, url, type]);
}

function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// ─── ARTICLE IMAGES — Stock photos matched to each headline ──

const ARTICLE_IMAGES = {
  // 3186: "Black Box of Guam" — courthouse / mystery / data
  3186: { url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=450&fit=crop', alt: 'Courthouse entrance in shadow representing public access challenges in Guam' },
  // 3185: "Architecture of Justice / Court Records Lifecycle"
  3185: { url: 'https://images.unsplash.com/photo-1575505586569-646b2ca898fc?w=800&h=450&fit=crop', alt: 'Ornate courthouse architecture symbolizing the justice system lifecycle' },
  // 3184: "DHS Circumventing Constitution / Buying Data"
  3184: { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=450&fit=crop', alt: 'Digital surveillance and data privacy concept with network connections' },
  // 3179: "London Searches / Magistrates & Crown Courts"
  3179: { url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=450&fit=crop', alt: 'London cityscape with Big Ben and Parliament representing UK court jurisdictions' },
  // 3176: "Seoul District Courts"
  3176: { url: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&h=450&fit=crop', alt: 'Seoul South Korea cityscape with modern buildings and traditional architecture' },
  // 3175: "Summary vs. Indictable Offenses — Canada"
  3175: { url: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&h=450&fit=crop', alt: 'Canadian courthouse with scales of justice representing offense classifications' },
  // 3183: "Ontario Criminal Courts Portal Delayed"
  3183: { url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=450&fit=crop', alt: 'Computer screen showing code and loading representing delayed Ontario court portal' },
  // 3182: "England/Wales DBS Searches Delayed"
  3182: { url: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?w=800&h=450&fit=crop', alt: 'London Tower Bridge representing England and Wales DBS processing delays' },
  // 3181: "Non-party Access to Civil Court Documents"
  3181: { url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=450&fit=crop', alt: 'Legal documents and folders representing civil court document access' },
  // 3180: "Canada — Justice is Blind"
  3180: { url: 'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=800&h=450&fit=crop', alt: 'Scales of justice symbolizing blindfolded justice in Canadian courts' },
  // 3177: "LA County Municipal Courts"
  3177: { url: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=450&fit=crop', alt: 'Los Angeles downtown skyline representing municipal court consolidation' },
  // 3161: "Ethics, Risks, Liability of Record Retriever"
  3161: { url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&h=450&fit=crop', alt: 'Legal library and law books representing ethics and compliance risks' },
  // 3156: "Schedule III Marijuana / DOT Testing"
  3156: { url: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=800&h=450&fit=crop', alt: 'Medical testing laboratory representing DOT federal drug testing protocols' },
  // 3163: "Social Media Screening Compliance Trap"
  3163: { url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&h=450&fit=crop', alt: 'Smartphone showing social media apps representing screening compliance challenges' },
  // 3136: "Cayman Islands Services Upgrade"
  3136: { url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=800&h=450&fit=crop', alt: 'Caribbean tropical beach representing Cayman Islands service expansion' },
  // 3114: "Original Criminal Record Provider"
  3114: { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=450&fit=crop', alt: 'Professional reviewing criminal record documents at desk' },
};

let FALLBACK_IMAGE = { url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=450&fit=crop', alt: 'Background screening industry' };

function ArticleImage({ aspect = '16/9', height, style = {}, seed = 1, category = 'Top Stories', src }) {
  const img = src ? { url: src, alt: '' } : (ARTICLE_IMAGES[seed] || FALLBACK_IMAGE);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Category color overlays
  const overlayColors = {
    'Top Stories': 'rgba(192,57,43,0.08)',
    'International News': 'rgba(21,101,192,0.08)',
    'National News': 'rgba(13,59,102,0.08)',
    'Press Releases': 'rgba(106,27,154,0.08)',
  };

  return (
    <div style={{
      width: '100%', aspectRatio: aspect, ...(height ? { height, aspectRatio: 'unset' } : {}),
      position: 'relative', overflow: 'hidden', background: '#0d1b2a', ...style,
    }}>
      {/* Loading skeleton */}
      {!loaded && !error && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 35%, #1a3a4a 65%, #0d2137 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 40, height: 40, border: '2px solid #1a3a5a', borderTopColor: '#3a6a9a',
            borderRadius: '50%', animation: 'imgspin 1s linear infinite',
          }} />
        </div>
      )}

      {/* Error fallback */}
      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 35%, #1a3a4a 65%, #0d2137 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
          </svg>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, textTransform: 'uppercase' }}>Image unavailable</span>
        </div>
      )}

      {/* Actual photo */}
      <img
        src={img.url}
        alt={img.alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 400ms ease',
        }}
      />

      {/* Subtle color overlay matching category */}
      {loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.3) 100%), ${overlayColors[category] || 'transparent'}`,
        }} />
      )}
    </div>
  );
}

// ─── CATEGORY TAG ────────────────────────────────────────

function CatTag({ category, onClick }) {
  return (
    <span
      onClick={onClick}
      style={{
        fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 700,
        color: '#fff', background: CAT_COLORS[category] || '#444',
        padding: '3px 10px', borderRadius: 2, letterSpacing: '0.8px',
        textTransform: 'uppercase', cursor: onClick ? 'pointer' : 'default',
        display: 'inline-block', lineHeight: 1.5,
      }}
    >{category}</span>
  );
}

// ─── AD SLOT ─────────────────────────────────────────────

function AdSlot({ position, w = '100%', h = 90, maxW = 728, style = {} }) {
  const [ad, setAd] = useState(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!position) { setTried(true); return; }
    getAds(position)
      .then(ads => { setAd(ads?.[0] || null); })
      .catch(() => {})
      .finally(() => setTried(true));
  }, [position]);

  if (!tried || !ad) return null;

  const inner = (
    <img
      src={ad.image_url}
      alt={ad.name}
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
    />
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'center', ...style }}>
      <div style={{ width: w, maxWidth: maxW, height: h, overflow: 'hidden', lineHeight: 0 }}>
        {ad.link_url
          ? <a href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored" style={{ display: 'block', height: '100%' }}>{inner}</a>
          : inner}
      </div>
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────

function Header({ currentPage, setPage, highlightIds }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    if (highlightIds === null) return; // wait until homepage has reported back
    if (highlightIds.length > 0) {
      Promise.all(highlightIds.map(id => getArticle(id).catch(() => null)))
        .then(articles => setHighlights(articles.filter(Boolean)));
    } else {
      // No curated IDs saved — fall back to 4 most recent
      getArticles({ limit: 4, page: 1 })
        .then(res => setHighlights(res.data || []))
        .catch(() => {});
    }
  }, [JSON.stringify(highlightIds)]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => setMenuOpen(false), [currentPage]);

  const navItems = [
    { key: 'home', label: 'Home' },
    { key: 'topStories', label: 'Top Stories' },
    { key: 'internationalNews', label: 'International' },
    { key: 'nationalNews', label: 'National' },
    { key: 'events', label: 'Events' },
    { key: 'advertise', label: 'Advertise' },
    { key: 'contact', label: 'Contact' },
  ];

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: scrolled ? 'rgba(255,255,255,0.98)' : '#fff',
      boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.06)' : 'none',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      transition: 'all 250ms ease',
    }}>
      {/* Main bar */}
      <div className="wrap" style={{ padding: scrolled ? '10px 24px' : '16px 24px', transition: 'padding 250ms ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div onClick={() => setPage('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 6,
              background: 'linear-gradient(135deg, #0d1b2a, #1a3a4a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#c0392b', fontFamily: 'var(--f-display)', fontSize: 21, fontWeight: 700,
            }}>B</div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: -0.5 }}>The Background</div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: 17, fontWeight: 700, color: '#c0392b', letterSpacing: -0.5 }}>Investigator</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="desktop-only" aria-label="Primary navigation" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {navItems.map(n => (
              <button key={n.key} onClick={() => setPage(n.key)} style={{
                background: 'none', border: 'none', fontFamily: 'var(--f-ui)',
                fontSize: 'var(--text-sm)', fontWeight: currentPage === n.key ? 700 : 500,
                color: currentPage === n.key ? '#c0392b' : 'var(--color-text-secondary)',
                padding: '8px 14px', cursor: 'pointer', letterSpacing: 0.2,
                borderBottom: currentPage === n.key ? '2px solid #c0392b' : '2px solid transparent',
                transition: 'all 150ms ease',
              }}>{n.label}</button>
            ))}
            <button onClick={() => setPage('subscribe')} style={{
              background: '#c0392b', color: '#fff', border: 'none', fontFamily: 'var(--f-ui)',
              fontSize: 'var(--text-xs)', fontWeight: 700, padding: '9px 20px', borderRadius: 3,
              marginLeft: 10, cursor: 'pointer', letterSpacing: 0.8, textTransform: 'uppercase',
            }}>Stay Informed</button>
          </nav>

          {/* Mobile menu toggle */}
          <button className="mobile-only" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
            style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--color-primary)', padding: 8, cursor: 'pointer' }}
          >{menuOpen ? '✕' : '☰'}</button>
        </div>
      </div>

      {/* Highlights bar */}
      {!scrolled && currentPage === 'home' && (
        <div style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="wrap" style={{ display: 'flex', gap: 0, overflow: 'hidden' }}>
            {highlights.map((h, i) => (
              <button key={h.id} onClick={() => setPage('article-' + h.id, h.slug)} style={{
                flex: 1, background: 'none', border: 'none', borderRight: i < highlights.length - 1 ? '1px solid var(--color-border)' : 'none',
                padding: '10px 16px', cursor: 'pointer', textAlign: 'left', minWidth: 0,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontFamily: 'var(--f-ui)', fontSize: 9, fontWeight: 800, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 1.2, whiteSpace: 'nowrap' }}>{h.category?.name || ''}</span>
                <span style={{
                  fontFamily: 'var(--f-display)', fontSize: 'var(--text-sm)', fontWeight: 600,
                  color: 'var(--color-text-primary)', lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{h.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <nav className="mobile-only" style={{ background: '#fff', borderTop: '1px solid var(--color-border)', padding: '8px 0', flexDirection: 'column' }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => { setPage(n.key); setMenuOpen(false); }} style={{
              display: 'block', width: '100%', background: 'none', border: 'none', textAlign: 'left',
              fontFamily: 'var(--f-ui)', fontSize: 15, fontWeight: currentPage === n.key ? 700 : 400,
              color: currentPage === n.key ? '#c0392b' : '#333',
              padding: '12px 24px', borderBottom: '1px solid #f3f3f3', cursor: 'pointer',
            }}>{n.label}</button>
          ))}
        </nav>
      )}
    </header>
  );
}

// ─── HERO ZONE ───────────────────────────────────────────

function HeroZone({ setPage, hero: heroProp }) {
  const hero = heroProp;
  if (!hero) return null;
  return (
    <section aria-label="Lead story" style={{ background: '#0d1b2a', position: 'relative', overflow: 'hidden' }}>
      <div className="wrap" style={{ display: 'flex', gap: 0, minHeight: 420, flexWrap: 'wrap' }}>
        {/* Image — 60% on desktop */}
        <div className="hero-img-col" style={{ flex: '1 1 58%', minHeight: 300, position: 'relative' }}>
          <ArticleImage aspect="unset" style={{ height: '100%', borderRadius: 0 }} seed={hero.id} category={hero.category?.name || hero.category} src={hero.featured_image} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent 50%, #0d1b2a 100%)' }} />
        </div>
        {/* Text — 40% */}
        <div style={{
          flex: '1 1 38%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '48px 40px 48px 32px', position: 'relative', zIndex: 2, minWidth: 280,
        }}>
          <CatTag category={hero.category?.name || hero.category} onClick={() => setPage('topStories')} />
          <h1 onClick={() => setPage('article-' + hero.id, hero.slug)} style={{
            fontFamily: 'var(--f-display)', fontSize: 'clamp(1.75rem, 3vw, 2.75rem)',
            fontWeight: 700, color: '#fff', lineHeight: 1.15, marginTop: 14, cursor: 'pointer',
            letterSpacing: -0.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{hero.title}</h1>
          <p style={{
            fontFamily: 'var(--f-body)', fontSize: 'var(--text-base)', color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.7, marginTop: 16, maxWidth: 420,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{hero.excerpt}</p>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>By {hero.author?.display_name || hero.author}</span>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.3)' }}>{hero.publish_date ? new Date(hero.publish_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : hero.date}</span>
          </div>
          <button onClick={() => setPage('article-' + hero.id, hero.slug)} style={{
            background: 'none', border: 'none', color: '#c0392b', fontFamily: 'var(--f-ui)',
            fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', marginTop: 24,
            display: 'flex', alignItems: 'center', gap: 6, padding: 0,
          }}>Read full story <span style={{ fontSize: 16 }}>→</span></button>
        </div>
      </div>
    </section>
  );
}

// ─── CONTAINER A — Full-Width Feature Row ────────────────

function ContainerA({ article, reverse = false, setPage }) {
  const [ref, vis] = useScrollReveal();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(16px)',
      transition: 'all 500ms ease',
    }}>
      <article className="wrap" style={{
        display: 'flex', gap: 32, padding: '36px 24px',
        flexDirection: reverse ? 'row-reverse' : 'row', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{ flex: '1 1 55%', minWidth: 280, borderRadius: 6, overflow: 'hidden', cursor: 'pointer' }}
          onClick={() => setPage('article-' + article.id, article.slug)}
        >
          <div style={{ transition: 'transform 300ms ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ArticleImage aspect="16/9" seed={article.id} category={article.category?.name || article.category} src={article.featured_image} />
          </div>
        </div>
        <div style={{ flex: '1 1 38%', minWidth: 260 }}>
          <CatTag category={article.category?.name || article.category} onClick={() => setPage(CAT_NAME_TO_PAGE[article.category?.name || article.category] || 'topStories')} />
          <h2 onClick={() => setPage('article-' + article.id, article.slug)} style={{
            fontFamily: 'var(--f-display)', fontSize: 'var(--text-2xl)', fontWeight: 700,
            color: 'var(--color-text-primary)', lineHeight: 1.2, marginTop: 12, cursor: 'pointer',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            letterSpacing: -0.3,
          }}>{article.title}</h2>
          <p style={{
            fontFamily: 'var(--f-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)',
            lineHeight: 1.65, marginTop: 12,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{article.excerpt}</p>
          <div style={{ marginTop: 14, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{article.author?.display_name || article.author}</span> · {article.publish_date ? new Date(article.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : article.date}
          </div>
        </div>
      </article>
    </div>
  );
}

// ─── CONTAINER B — Three-Column Story Cluster ────────────

function ContainerB({ articles, setPage }) {
  const [ref, vis] = useScrollReveal();
  return (
    <div ref={ref} className="wrap" style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 28,
      padding: '12px 24px 36px',
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(16px)',
      transition: 'all 500ms ease',
    }}>
      {articles.map((a, i) => (
        <article key={a.id} onClick={() => setPage('article-' + a.id, a.slug)} style={{
          cursor: 'pointer', transitionDelay: `${i * 80}ms`,
          opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 400ms ease',
        }}>
          <div style={{ borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ transition: 'transform 300ms ease' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <ArticleImage aspect="4/3" seed={a.id} category={a.category?.name || a.category} src={a.featured_image} />
            </div>
          </div>
          <CatTag category={a.category?.name || a.category} />
          <h3 style={{
            fontFamily: 'var(--f-display)', fontSize: 'var(--text-lg)', fontWeight: 700,
            color: 'var(--color-text-primary)', lineHeight: 1.25, marginTop: 8,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{a.title}</h3>
          <div style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 8 }}>{a.author?.display_name || a.author}</div>
        </article>
      ))}
    </div>
  );
}

// ─── CONTAINER C — Two-Column Asymmetric ─────────────────

function ContainerC({ large, small, setPage }) {
  const [ref, vis] = useScrollReveal();
  return (
    <div ref={ref} className="wrap" style={{
      display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 28, padding: '12px 24px 36px',
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(16px)',
      transition: 'all 500ms ease',
    }}>
      <article onClick={() => setPage('article-' + large.id, large.slug)} style={{ cursor: 'pointer' }}>
        <div style={{ borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ transition: 'transform 300ms ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ArticleImage aspect="16/10" seed={large.id} category={large.category?.name || large.category} src={large.featured_image} />
          </div>
        </div>
        <CatTag category={large.category?.name || large.category} />
        <h3 style={{
          fontFamily: 'var(--f-display)', fontSize: 'var(--text-xl)', fontWeight: 700,
          color: 'var(--color-text-primary)', lineHeight: 1.2, marginTop: 10,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{large.title}</h3>
        <p style={{
          fontFamily: 'var(--f-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)',
          lineHeight: 1.6, marginTop: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{large.excerpt}</p>
      </article>
      <article onClick={() => setPage('article-' + small.id, small.slug)} style={{ cursor: 'pointer' }}>
        <div style={{ borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ transition: 'transform 300ms ease' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ArticleImage aspect="3/4" seed={small.id} category={small.category?.name || small.category} src={small.featured_image} />
          </div>
        </div>
        <CatTag category={small.category?.name || small.category} />
        <h3 style={{
          fontFamily: 'var(--f-display)', fontSize: 'var(--text-base)', fontWeight: 700,
          color: 'var(--color-text-primary)', lineHeight: 1.25, marginTop: 10,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{small.title}</h3>
      </article>
    </div>
  );
}

// ─── CONTAINER D — Section Band ──────────────────────────

function ContainerD({ title, articles, sectionKey, color, setPage }) {
  const [ref, vis] = useScrollReveal();
  return (
    <section ref={ref} aria-label={title} style={{
      background: 'var(--color-surface)', borderTop: `3px solid ${color}`,
      padding: '32px 0 40px', marginTop: 8,
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(16px)',
      transition: 'all 500ms ease',
    }}>
      <div className="wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--f-display)', fontSize: 'var(--text-xl)', fontWeight: 700,
            color, textTransform: 'uppercase', letterSpacing: 1,
          }}>{title}</h2>
          <button onClick={() => setPage(sectionKey)} style={{
            background: 'none', border: 'none', fontFamily: 'var(--f-ui)',
            fontSize: 'var(--text-xs)', fontWeight: 600, color: '#c0392b', cursor: 'pointer',
          }}>More {title} →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {articles.slice(0, 4).map((a, i) => (
            <article key={a.id} onClick={() => setPage('article-' + a.id, a.slug)} style={{
              cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start',
              transitionDelay: `${i * 60}ms`,
              opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 350ms ease',
            }}>
              <div style={{ flexShrink: 0, width: 72, borderRadius: 4, overflow: 'hidden' }}>
                <ArticleImage aspect="1/1" seed={a.id} category={a.category?.name || a.category} src={a.featured_image} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{
                  fontFamily: 'var(--f-display)', fontSize: 'var(--text-sm)', fontWeight: 600,
                  color: 'var(--color-text-primary)', lineHeight: 1.3,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{a.title}</h3>
                <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4, display: 'block' }}>{a.publish_date ? new Date(a.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : a.date}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────

function Sidebar({ setPage, mostReadOverride }) {
  const [mostReadList, setMostReadList] = useState(mostReadOverride || []);

  useEffect(() => {
    if (mostReadOverride && mostReadOverride.length > 0) {
      setMostReadList(mostReadOverride);
      return;
    }
    getMostRead()
      .then(data => { if (data?.length) setMostReadList(data); })
      .catch(() => {});
  }, [mostReadOverride]);

  return (
    <aside className="sidebar-col" aria-label="Sidebar" style={{ flex: '0 0 300px', width: 300, minWidth: 0, maxWidth: 300, marginTop: 36, overflow: 'hidden' }}>
      {/* Most Read */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{
          fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--color-text-secondary)',
          paddingBottom: 10, borderBottom: '2px solid #c0392b', marginBottom: 0,
        }}>Most Read</h3>
        {mostReadList.slice(0, 7).map((a, i) => (
          <div key={a.id} onClick={() => setPage('article-' + a.id, a.slug)} style={{
            display: 'flex', gap: 12, padding: '12px 0',
            borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
            alignItems: 'flex-start',
          }}>
            <span style={{
              fontFamily: 'var(--f-display)', fontSize: 'var(--text-2xl)', fontWeight: 700,
              color: i < 3 ? '#c0392b' : '#ddd', lineHeight: 1, minWidth: 28,
            }}>{i + 1}</span>
            <h4 style={{
              fontFamily: 'var(--f-display)', fontSize: 'var(--text-sm)', fontWeight: 600,
              color: 'var(--color-text-primary)', lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{a.title}</h4>
          </div>
        ))}
      </div>

      <AdSlot position="sidebar-1" w="100%" maxW={300} h={250} style={{ marginBottom: 28 }} />

      {/* Newsletter signup */}
      <SidebarSubscribe />

      {/* Partners */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 20, marginBottom: 28 }}>
        <h3 style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, color: 'var(--color-text-secondary)' }}>Partners</h3>
        {['Straightline International', 'Insolvenzverfahren'].map((p, i) => (
          <a key={i} href="#" style={{ display: 'block', fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: '#c0392b', padding: '8px 0', borderBottom: i === 0 ? '1px solid var(--color-border)' : 'none', textDecoration: 'none' }}>{p}</a>
        ))}
      </div>

      <AdSlot position="sidebar-2" w="100%" maxW={300} h={250} style={{ marginBottom: 28 }} />
    </aside>
  );
}

// ─── INLINE NEWSLETTER (between containers) ──────────────

function useSubscribeForm(source) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(''); // '' | 'loading' | 'ok' | 'error'
  const [msg, setMsg] = useState('');

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      await subscribe(email, source);
      setStatus('ok');
      setEmail('');
      setMsg('');
    } catch (err) {
      setStatus('error');
      setMsg(err.message);
    }
  }
  return { email, setEmail, status, msg, handleSubmit };
}

function SidebarSubscribe() {
  const { email, setEmail, status, msg, handleSubmit } = useSubscribeForm('sidebar');
  return (
    <div style={{ background: '#0d1b2a', borderRadius: 6, padding: '28px 24px', marginBottom: 28 }}>
      <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-lg)', color: '#fff', fontWeight: 700, marginBottom: 6 }}>
        Get the day's top stories.
      </h3>
      <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 16 }}>
        Background screening news delivered to your inbox every morning.
      </p>
      {status === 'ok' ? (
        <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: '#4ade80', textAlign: 'center' }}>✓ You're subscribed!</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" type="email" required
            style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: 3, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', marginBottom: 10, boxSizing: 'border-box', outline: 'none' }} />
          {status === 'error' && <p style={{ fontFamily: 'var(--f-ui)', fontSize: 11, color: '#f87171', marginBottom: 8 }}>{msg}</p>}
          <button type="submit" disabled={status === 'loading'}
            style={{ width: '100%', padding: 10, background: '#c0392b', color: '#fff', border: 'none', borderRadius: 3, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
            {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>
      )}
    </div>
  );
}

function FooterSubscribe() {
  const { email, setEmail, status, msg, handleSubmit } = useSubscribeForm('footer');
  return (
    <div style={{ flex: '1 1 240px' }}>
      <h3 style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: '#fff', fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Subscribe</h3>
      <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', marginBottom: 12, lineHeight: 1.5 }}>Get the day's top stories in your inbox.</p>
      {status === 'ok' ? (
        <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: '#4ade80' }}>✓ You're subscribed!</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required
            style={{ flex: 1, padding: '9px 12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: 3, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', outline: 'none' }} />
          <button type="submit" disabled={status === 'loading'}
            style={{ padding: '9px 16px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 3, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, cursor: 'pointer', opacity: status === 'loading' ? 0.7 : 1 }}>
            {status === 'loading' ? '…' : 'Go'}
          </button>
        </form>
      )}
    </div>
  );
}

function InlineNewsletter() {
  const { email, setEmail, status, msg, handleSubmit } = useSubscribeForm('inline');
  const [ref, vis] = useScrollReveal();
  return (
    <div ref={ref} className="wrap" style={{ padding: '0 24px', opacity: vis ? 1 : 0, transition: 'opacity 500ms ease' }}>
      <div style={{ background: 'linear-gradient(135deg, #0d1b2a, #1a3a4a)', borderRadius: 8, padding: '32px 40px', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', justifyContent: 'space-between', margin: '20px 0' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-xl)', color: '#fff', fontWeight: 700, marginBottom: 4 }}>Stay ahead of compliance changes.</h3>
          <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)' }}>Join thousands of screening professionals who read BKI daily.</p>
        </div>
        {status === 'ok' ? (
          <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-base)', color: '#4ade80', flex: '1 1 260px' }}>✓ You're subscribed!</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flex: '1 1 260px', flexWrap: 'wrap' }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" required
              style={{ flex: '1 1 180px', minWidth: 0, padding: '11px 14px', border: `1px solid ${status === 'error' ? '#f87171' : 'rgba(255,255,255,0.2)'}`, background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 3, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', outline: 'none' }} />
            <button type="submit" disabled={status === 'loading'}
              style={{ padding: '11px 22px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 3, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto', opacity: status === 'loading' ? 0.7 : 1 }}>
              {status === 'loading' ? '…' : 'Subscribe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── HOME PAGE ───────────────────────────────────────────

// Map category slug → page key used by the existing navigation
const SLUG_TO_PAGE = {
  'top-stories':        'topStories',
  'international-news': 'internationalNews',
  'national-news':      'nationalNews',
  'press-releases':     'pressReleases',
};

function HomePage({ setPage, onHighlightIds }) {
  useMeta({});
  const [hpData, setHpData] = useState(null);
  const [hpLoading, setHpLoading] = useState(true);

  useEffect(() => {
    getHomepage()
      .then(data => {
        setHpData(data);
        if (onHighlightIds) onHighlightIds(data?.highlights || []);
      })
      .catch(() => {
        setHpData({ sections: [], mostRead: [], highlights: [] });
        if (onHighlightIds) onHighlightIds([]);
      })
      .finally(() => setHpLoading(false));
  }, []);

  const sections  = hpData?.sections  || [];
  const mostRead  = hpData?.mostRead  || [];
  const heroArticle = sections[0]?.articles?.[0] || null;

  if (hpLoading) return (
    <div style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontFamily: 'var(--f-ui)' }}>
      Loading…
    </div>
  );

  if (sections.length === 0) return (
    <div style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--f-ui)' }}>
      <p style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>No content yet.</p>
      <p style={{ fontSize: 'var(--text-sm)' }}>Add categories and articles in the <strong>Admin → Homepage</strong> section.</p>
    </div>
  );

  return (
    <>
      <HeroZone setPage={setPage} hero={heroArticle} />

      <div className="wrap" style={{ display: 'flex', gap: 40, flexWrap: 'wrap', padding: '0 24px' }}>
        <div style={{ flex: '1 1 600px', minWidth: 0 }}>
          {sections.map((sec, idx) => {
            const pageKey = SLUG_TO_PAGE[sec.category.slug] || sec.category.slug;
            const arts = sec.articles;
            if (arts.length === 0) return null;
            const layout = sec.layout || 'band';
            return (
              <div key={sec.category.id}>
                {layout === 'featured' && (
                  <>
                    <ContainerD
                      title={sec.category.name}
                      articles={arts}
                      sectionKey={pageKey}
                      color={sec.category.color_hex}
                      setPage={setPage}
                    />
                    {arts[0] && <ContainerA article={arts[0]} setPage={setPage} />}
                  </>
                )}
                {layout === 'grid' && (
                  <>
                    <ContainerD
                      title={sec.category.name}
                      articles={arts}
                      sectionKey={pageKey}
                      color={sec.category.color_hex}
                      setPage={setPage}
                    />
                    <ContainerB articles={arts} setPage={setPage} />
                  </>
                )}
                {layout === 'band' && (
                  <ContainerD
                    title={sec.category.name}
                    articles={arts}
                    sectionKey={pageKey}
                    color={sec.category.color_hex}
                    setPage={setPage}
                  />
                )}
                {idx === 1 && <InlineNewsletter />}
              </div>
            );
          })}
          <AdSlot position="leaderboard-mid" style={{ margin: '20px 0 40px' }} />
        </div>

        <Sidebar setPage={setPage} mostReadOverride={mostRead} />
      </div>
    </>
  );
}

// Map page key → category slug for the API
const PAGE_TO_SLUG = {
  topStories:        'top-stories',
  internationalNews: 'international-news',
  nationalNews:      'national-news',
  pressReleases:     'press-releases',
};

// ─── CATEGORY PAGE ───────────────────────────────────────

function CategoryPage({ category, title, setPage }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const color = CAT_COLORS[articles[0]?.category?.name] || CAT_COLORS[title] || '#444';
  useMeta({ title, description: `Latest ${title.toLowerCase()} from The Background Investigator.` });

  useEffect(() => {
    const slug = PAGE_TO_SLUG[category];
    if (!slug) { setLoading(false); return; }
    setLoading(true);
    getCategory(slug, currentPage)
      .then(res => {
        setArticles(res.data || []);
        setTotalPages(res.meta?.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, currentPage]);

  // Reset to page 1 when switching categories
  useEffect(() => { setCurrentPage(1); }, [category]);

  if (loading) return (
    <div className="wrap" style={{ padding: '0 24px', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--f-ui)', color: 'var(--color-text-secondary)' }}>Loading…</p>
    </div>
  );

  return (
    <div className="wrap" style={{ padding: '0 24px' }}>
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 600px', minWidth: 0 }}>
          <div style={{ borderBottom: `3px solid ${color}`, paddingBottom: 8, marginTop: 32, marginBottom: 4 }}>
            <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color }}>{title}</h1>
          </div>
          {articles.length === 0 && (
            <p style={{ fontFamily: 'var(--f-ui)', color: 'var(--color-text-secondary)', padding: '40px 0' }}>No articles yet.</p>
          )}
          {articles[0] && <ContainerA article={articles[0]} setPage={setPage} />}
          <AdSlot position="leaderboard-mid" style={{ margin: '8px 0 20px' }} />
          {articles.length > 1 && <ContainerB articles={articles.slice(1, 4)} setPage={setPage} />}
          {articles.length > 4 && articles.slice(4).map(a => (
            <article key={a.id} onClick={() => setPage('article-' + a.id, a.slug)} style={{
              display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
            }}>
              <div style={{ flexShrink: 0, width: 100, borderRadius: 4, overflow: 'hidden' }}>
                <ArticleImage aspect="4/3" seed={a.id} category={a.category?.name || a.category} src={a.featured_image} />
              </div>
              <div>
                <CatTag category={a.category?.name || a.category} />
                <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, marginTop: 6 }}>{a.title}</h3>
                <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 6, display: 'block' }}>
                  {a.author?.display_name || a.author} · {a.publish_date ? new Date(a.publish_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : a.date}
                </span>
              </div>
            </article>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '32px 0 16px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage <= 1}
                style={pagerBtn(false, currentPage <= 1)}
              >← Prev</button>

              {catPageWindow(currentPage, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} style={{ fontFamily: 'var(--f-ui)', fontSize: 13, color: 'var(--color-text-secondary)', padding: '0 4px' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={pagerBtn(p === currentPage, false, color)}
                  >{p}</button>
                )
              )}

              <button
                onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage >= totalPages}
                style={pagerBtn(false, currentPage >= totalPages)}
              >Next →</button>
            </div>
          )}
        </div>
        <Sidebar setPage={setPage} />
      </div>
    </div>
  );
}

// ─── ARTICLE PAGE ────────────────────────────────────────

const CAT_NAME_TO_PAGE = {
  'Top Stories': 'topStories',
  'International News': 'internationalNews',
  'National News': 'nationalNews',
  'Press Releases': 'pressReleases',
};

function ArticlePage({ articleId, setPage, onSlug }) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    setLoading(true);
    setRelated([]);
    getArticle(articleId)
      .then(a => {
        setArticle(a);
        if (a?.slug && onSlug) onSlug(a.slug);
        if (a?.category?.slug) {
          getArticles({ category: a.category.slug, limit: 4 })
            .then(res => {
              const items = (res?.data || []).filter(r => r.id !== articleId).slice(0, 3);
              setRelated(items);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [articleId]);

  const catName = article?.category?.name || article?.category || '';
  const catKey = CAT_NAME_TO_PAGE[catName] || 'topStories';
  const articleImg = article ? (article.featured_image ? { url: article.featured_image, alt: article.title } : (ARTICLE_IMAGES[article.id] || FALLBACK_IMAGE)) : FALLBACK_IMAGE;

  useMeta(article ? {
    title: article.seo_title || article.title,
    description: article.seo_description || article.excerpt,
    image: article.og_image || articleImg.url,
    type: 'article',
  } : {});

  if (loading && !article) return <div className="wrap" style={{ padding: 60, textAlign: 'center' }}><p style={{ color: 'var(--color-text-secondary)' }}>Loading…</p></div>;
  if (!article) return <div className="wrap" style={{ padding: 60, textAlign: 'center' }}><p>Article not found.</p></div>;
  return (
    <div className="wrap" style={{ padding: '0 24px' }}>
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <article style={{ flex: '1 1 600px', minWidth: 0, maxWidth: 720, paddingTop: 32, overflow: 'hidden' }}>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            <span onClick={() => setPage('home')} style={{ cursor: 'pointer', color: '#c0392b' }}>Home</span>
            <span style={{ margin: '0 6px', color: '#ccc' }}>/</span>
            <span onClick={() => setPage(catKey)} style={{ cursor: 'pointer', color: '#c0392b' }}>{catName}</span>
            <span style={{ margin: '0 6px', color: '#ccc' }}>/</span>
            <span>{article.title.substring(0, 40)}…</span>
          </nav>

          <CatTag category={catName} onClick={() => setPage(catKey)} />
          <h1 style={{
            fontFamily: 'var(--f-display)', fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
            fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.18,
            marginTop: 12, letterSpacing: -0.5,
          }}>{article.title}</h1>

          <div style={{ margin: '16px 0 20px', paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              By <strong style={{ color: 'var(--color-text-primary)' }}>{article.author?.display_name || article.author}</strong>
            </div>
            {(article.publish_date || article.created_at || article.date) && (
              <div style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                {(() => {
                  const raw = article.publish_date || article.created_at || article.date;
                  const d = new Date(raw);
                  return isNaN(d) ? raw : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                })()}
              </div>
            )}
          </div>

          <div style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 28 }}>
            <ArticleImage aspect="16/8" seed={article.id} category={catName} src={articleImg.url} />
          </div>

          <AdSlot position="in-feed" style={{ margin: '0 0 28px' }} />

          <div style={{ fontFamily: 'var(--f-body)', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', lineHeight: 1.8 }}>
            {article.body ? (
              <div dangerouslySetInnerHTML={{ __html: article.body }} />
            ) : (
              article.excerpt?.split('. ').map((s, i) => (
                <p key={i} style={{ marginBottom: 20 }}>{s.trim()}{s.endsWith('.') ? '' : '.'}</p>
              ))
            )}
          </div>

          <AdSlot position="leaderboard-top" style={{ margin: '32px 0' }} />

          {/* Share */}
          {article && (() => {
            const articleUrl = `${SITE_URL}/Articles/${article.slug}/${article.id}/`;
            const encoded    = encodeURIComponent(articleUrl);
            const encodedTitle = encodeURIComponent(article.title || '');
            const shares = [
              {
                label: 'Facebook',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                ),
                bg: '#1877f2', color: '#fff',
                href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
              },
              {
                label: 'X',
                icon: (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L2.25 2.25h6.845l4.265 5.638zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                ),
                bg: '#000', color: '#fff',
                href: `https://x.com/intent/tweet?url=${encoded}&text=${encodedTitle}`,
              },
              {
                label: 'Email',
                icon: (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                ),
                bg: '#374151', color: '#fff',
                href: `mailto:?subject=${encodedTitle}&body=I thought you might find this interesting: ${articleUrl}`,
              },
            ];
            return (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 20, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 600, marginRight: 2 }}>Share:</span>
                {shares.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target={s.label !== 'Email' ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    onClick={s.label !== 'Email' ? e => { e.preventDefault(); window.open(s.href, '_blank', 'width=600,height=480,noopener'); } : undefined}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 4, textDecoration: 'none',
                      background: s.bg, color: s.color,
                      fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 600,
                      transition: 'opacity .15s', cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    {s.icon}{s.label}
                  </a>
                ))}
              </div>
            );
          })()}

          {/* Related */}
          {related.length > 0 && (
            <section style={{ marginTop: 48, marginBottom: 40 }}>
              <h2 style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--color-text-secondary)', paddingBottom: 10, borderBottom: '2px solid var(--color-primary)', marginBottom: 0 }}>Related Articles</h2>
              {related.map(r => {
                const rCatName = r.category?.name || r.category || '';
                const rDate = r.publish_date || r.created_at || r.date || '';
                const rDateStr = rDate ? (() => { const d = new Date(rDate); return isNaN(d) ? rDate : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); })() : '';
                return (
                  <div key={r.id} onClick={() => setPage('article-' + r.id, r.slug)} style={{
                    display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', alignItems: 'flex-start',
                  }}>
                    <div style={{ flexShrink: 0, width: 90, borderRadius: 4, overflow: 'hidden' }}>
                      <ArticleImage aspect="4/3" seed={r.id} category={rCatName} src={r.featured_image} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>{r.title}</h3>
                      {rDateStr && <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 6, display: 'block' }}>{rDateStr}</span>}
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </article>
        <Sidebar setPage={setPage} />
      </div>
    </div>
  );
}

// ─── EVENTS PAGE ─────────────────────────────────────────

function EventsPage({ setPage }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  useMeta({ title: 'Upcoming Events', description: 'Industry conferences and networking events for background screening professionals.' });

  useEffect(() => {
    getEvents()
      .then(data => { setEvents(data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="wrap" style={{ padding: '32px 24px 60px', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--f-ui)', color: 'var(--color-text-secondary)' }}>Loading…</p>
    </div>
  );

  if (selected) return (
    <div className="wrap" style={{ maxWidth: 760, padding: '32px 24px 60px' }}>
      <button onClick={() => setSelected(null)} style={{
        background: 'none', border: 'none', fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)',
        color: '#c0392b', cursor: 'pointer', padding: 0, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6,
      }}>← Back to Events</button>
      <div style={{ borderTop: '4px solid #c0392b', paddingTop: 28 }}>
        <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 1 }}>
          {selected.event_date || selected.date}
        </span>
        <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)', marginTop: 12, marginBottom: 8, lineHeight: 1.2 }}>{selected.title}</h1>
        {selected.location && (
          <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍</span> {selected.location}
          </p>
        )}
        <div style={{ fontFamily: 'var(--f-body)', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', lineHeight: 1.8, marginBottom: 32 }}>
          {selected.description}
        </div>
        {selected.url && (
          <a href={selected.url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-block', padding: '12px 28px', background: '#c0392b', color: '#fff',
            fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', fontWeight: 700, borderRadius: 4, textDecoration: 'none',
          }}>Learn more →</a>
        )}
      </div>
    </div>
  );

  return (
    <div className="wrap" style={{ padding: '32px 24px 60px' }}>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>Upcoming Events</h1>
      <p style={{ fontFamily: 'var(--f-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', maxWidth: 560, lineHeight: 1.6, marginBottom: 32 }}>Industry conferences and networking for background screening professionals.</p>
      {events.length === 0 && <p style={{ fontFamily: 'var(--f-ui)', color: 'var(--color-text-secondary)' }}>No upcoming events at this time.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {events.map((e, i) => (
          <div key={e.id || i} onClick={() => setSelected(e)} style={{
            border: '1px solid var(--color-border)', borderRadius: 6, padding: 28, borderTop: '3px solid #c0392b',
            cursor: 'pointer', transition: 'box-shadow 150ms ease',
          }}
            onMouseEnter={ev => ev.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
            onMouseLeave={ev => ev.currentTarget.style.boxShadow = 'none'}
          >
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: 1 }}>{e.event_date || e.date}</span>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 8, lineHeight: 1.3 }}>{e.title}</h2>
            <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 6 }}>{e.location}</p>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 10, lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{e.description}</p>
            <span style={{ display: 'inline-block', marginTop: 12, fontSize: 'var(--text-xs)', color: '#c0392b', fontFamily: 'var(--f-ui)', fontWeight: 600 }}>View details →</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ADVERTISE PAGE ──────────────────────────────────────

function AdvertisePage() {
  useMeta({ title: 'Advertise With Us', description: 'Reach thousands of CRAs, compliance officers, and HR decision-makers with targeted ad placements on The Background Investigator.' });
  return (
    <div className="wrap" style={{ maxWidth: 800, padding: '32px 24px 60px' }}>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>Advertise With Us</h1>
      <p style={{ fontFamily: 'var(--f-body)', fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: 32 }}>Reach thousands of CRAs, compliance officers, and HR decision-makers with targeted placements.</p>
      {[
        { name: 'Leaderboard Banner', size: '728×90', pos: 'Top of page, maximum visibility' },
        { name: 'Sidebar Rectangle', size: '300×250', pos: 'Sticky right column' },
        { name: 'In-Feed Native', size: '728×90', pos: 'Between content containers' },
        { name: 'Hero Sponsor', size: 'Custom', pos: 'Lead story adjacency' },
      ].map((ad, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-base)', fontWeight: 600 }}>{ad.name}</h3>
            <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>{ad.pos}</p>
          </div>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, color: '#c0392b', background: '#fdecea', padding: '4px 12px', borderRadius: 3 }}>{ad.size}</span>
        </div>
      ))}
      <div style={{ background: '#0d1b2a', borderRadius: 6, padding: 32, textAlign: 'center', marginTop: 32 }}>
        <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-xl)', color: '#fff', marginBottom: 8 }}>Ready to reach our audience?</h2>
        <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>Contact us for rates and availability</p>
        <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-base)', color: '#c0392b', fontWeight: 600 }}>866-909-6678</p>
      </div>
    </div>
  );
}

// ─── CONTACT PAGE ────────────────────────────────────────

function ContactPage() {
  useMeta({ title: 'Contact Us', description: 'Get in touch with The Background Investigator — questions, tips, or advertising inquiries.' });
  const [form, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState(''); // '' | 'sending' | 'sent' | 'error'

  function setF(k, v) { setContactForm(f => ({ ...f, [k]: v })); }

  async function handleContactSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      await submitContact(form);
      setStatus('sent');
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="wrap" style={{ maxWidth: 800, padding: '32px 24px 60px' }}>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>Contact Us</h1>
      <p style={{ fontFamily: 'var(--f-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>Questions, tips, or advertising inquiries — we'd love to hear from you.</p>
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <form style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={handleContactSubmit}>
          {status === 'sent' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 16px', borderRadius: 4, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)' }}>
              Message sent! We'll be in touch soon.
            </div>
          )}
          {status === 'error' && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: 4, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)' }}>
              Something went wrong. Please try again.
            </div>
          )}
          {[['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Subject', 'subject', 'text']].map(([label, key, type]) => (
            <div key={key}>
              <label style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>{label}</label>
              <input type={type} required={key !== 'subject'} value={form[key]} onChange={e => setF(key, e.target.value)}
                placeholder={label} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--color-border)', borderRadius: 4, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', boxSizing: 'border-box', outline: 'none' }} />
            </div>
          ))}
          <div>
            <label style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Message</label>
            <textarea required rows={5} value={form.message} onChange={e => setF('message', e.target.value)}
              placeholder="Your message..." style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--color-border)', borderRadius: 4, fontFamily: 'var(--f-body)', fontSize: 'var(--text-sm)', boxSizing: 'border-box', resize: 'vertical', outline: 'none' }} />
          </div>
          <button type="submit" disabled={status === 'sending'} style={{ padding: '12px 28px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 3, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start', opacity: status === 'sending' ? .7 : 1 }}>
            {status === 'sending' ? 'Sending…' : 'Send Message'}
          </button>
        </form>
        <div style={{ flex: '1 1 220px', background: 'var(--color-surface)', borderRadius: 6, padding: 28, border: '1px solid var(--color-border)' }}>
          <h2 style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 16 }}>Office</h2>
          <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            The Background Investigator<br />PMB 1007 Box 10001<br />Saipan, MP 96950
          </p>
          <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 16, lineHeight: 1.8 }}>
            <strong>Ph:</strong> 866-909-6678<br /><strong>Fax:</strong> 866-909-6679
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SUBSCRIBE PAGE ──────────────────────────────────────

function SubscribePage() {
  useMeta({ title: 'Subscribe', description: 'Subscribe to The Background Investigator newsletter — background screening news delivered to your inbox.' });
  const { email, setEmail, status, msg, handleSubmit } = useSubscribeForm('subscribe-page');
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg, #0d1b2a, #1a3a4a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#c0392b', fontFamily: 'var(--f-display)', fontSize: 28, fontWeight: 700 }}>B</div>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 12 }}>Stay Informed</h1>
      <p style={{ fontFamily: 'var(--f-body)', fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 36 }}>Background screening news, court record updates, and compliance analysis — delivered to your inbox.</p>
      {status === 'ok' ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '24px', color: '#166534', fontFamily: 'var(--f-ui)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <strong>You're subscribed!</strong>
          <p style={{ marginTop: 6, fontSize: 'var(--text-sm)', color: '#15803d' }}>Thank you for subscribing to The Background Investigator.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 400, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" type="email" required
            style={{ flex: '1 1 240px', padding: '14px 18px', border: `1px solid ${status === 'error' ? '#fca5a5' : 'var(--color-border)'}`, borderRadius: 4, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-base)', outline: 'none' }} />
          <button type="submit" disabled={status === 'loading'}
            style={{ padding: '14px 24px', background: '#c0392b', color: '#fff', border: 'none', borderRadius: 4, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: status === 'loading' ? 0.7 : 1 }}>
            {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
          </button>
          {status === 'error' && <p style={{ width: '100%', fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: '#dc2626', marginTop: 4 }}>{msg}</p>}
        </form>
      )}
      <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 14 }}>By subscribing you agree to our Terms & Privacy Policy</p>
    </div>
  );
}

// ─── ARCHIVES PAGE ───────────────────────────────────────

function ArchivesPage() {
  useMeta({ title: 'Archives', description: 'Browse and download past PDF editions of The Background Investigator.' });
  const months = ['January 2026', 'December 2025', 'November 2025', 'October 2025', 'September 2025', 'August 2025', 'July 2025', 'June 2025'];
  return (
    <div className="wrap" style={{ padding: '32px 24px 60px', maxWidth: 800 }}>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8 }}>Archives</h1>
      <p style={{ fontFamily: 'var(--f-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>Browse and download past PDF editions.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        {months.map((m, i) => (
          <div key={i} style={{
            border: '1px solid var(--color-border)', borderRadius: 6, padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
            background: i === 0 ? '#0d1b2a' : '#fff', borderTop: i === 0 ? '3px solid #c0392b' : '1px solid var(--color-border)',
          }}>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', fontWeight: 700, color: i === 0 ? '#c0392b' : 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>{i === 0 ? 'Latest' : 'Archive'}</span>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: i === 0 ? '#fff' : 'var(--color-text-primary)' }}>{m}</h2>
            <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: i === 0 ? 'rgba(255,255,255,0.5)' : 'var(--color-text-secondary)', marginTop: 6, display: 'block' }}>Download PDF</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FOOTER ──────────────────────────────────────────────

function Footer({ setPage }) {
  return (
    <footer style={{ background: '#0d1b2a', color: 'rgba(255,255,255,0.55)', marginTop: 0 }}>
      {/* Banner ad */}
      <AdSlot position="footer-banner" w="100%" maxW={9999} h={60} style={{ background: 'rgba(0,0,0,0.15)', padding: '0' }} />

      <div className="wrap" style={{ padding: '48px 24px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48, marginBottom: 40 }}>
          {/* About */}
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-xl)', color: '#fff', fontWeight: 700, marginBottom: 12 }}>
              The Background<br /><span style={{ color: '#c0392b' }}>Investigator</span>
            </div>
            <p style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>Your information resource for the background investigation industry. Dedicated to pre-employment screenings everywhere.</p>
          </div>

          {/* Sections */}
          <nav style={{ flex: '1 1 130px' }}>
            <h3 style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: '#fff', fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Sections</h3>
            {[
              { label: 'Top Stories', key: 'topStories' },
              { label: 'International News', key: 'internationalNews' },
              { label: 'National News', key: 'nationalNews' },
              { label: 'Press Releases', key: 'pressReleases' },
            ].map(l => (
              <button key={l.key} onClick={() => setPage(l.key)} style={{ display: 'block', background: 'none', border: 'none', fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.55)', padding: '5px 0', cursor: 'pointer', textAlign: 'left' }}>{l.label}</button>
            ))}
          </nav>

          {/* Company */}
          <nav style={{ flex: '1 1 130px' }}>
            <h3 style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)', color: '#fff', fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Company</h3>
            {[
              { label: 'Events', key: 'events' },
              { label: 'Advertise', key: 'advertise' },
              { label: 'Archives', key: 'archives' },
              { label: 'Contact', key: 'contact' },
              { label: 'Privacy', key: 'privacy' },
            ].map(l => (
              <button key={l.key} onClick={() => setPage(l.key)} style={{ display: 'block', background: 'none', border: 'none', fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.55)', padding: '5px 0', cursor: 'pointer', textAlign: 'left' }}>{l.label}</button>
            ))}
          </nav>

          {/* Footer newsletter — second conversion point */}
          <FooterSubscribe />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)' }}>© 2026 The Background Investigator. All Rights Reserved.</span>
          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)' }}>
            <button onClick={() => setPage('privacy')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'var(--f-ui)', fontSize: 'var(--text-xs)' }}>Privacy</button>
            <span>·</span>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── CATEGORY PAGE HELPERS ───────────────────────────────

function catPageWindow(current, total) {
  const delta = 2;
  const pages = [];
  const start = Math.max(2, current - delta);
  const end   = Math.min(total - 1, current + delta);
  pages.push(1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('…');
  if (total > 1) pages.push(total);
  return pages;
}

function pagerBtn(active, disabled, color = '#c0392b') {
  return {
    padding: '6px 13px', borderRadius: 4, fontSize: 13,
    fontFamily: 'var(--f-ui)', cursor: disabled ? 'default' : 'pointer',
    border: `1px solid ${active ? color : 'var(--color-border)'}`,
    background: active ? color : '#fff',
    color: active ? '#fff' : disabled ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
    opacity: disabled ? 0.45 : 1,
  };
}

// ─── URL HELPERS ─────────────────────────────────────────

function parsePathToPage(pathname) {
  // /Articles/{title-slug}/{id}/  or  /Articles/{title-slug}/{id}
  const m = pathname.match(/^\/Articles\/[^/]+\/(\d+)\/?$/i);
  if (m) return 'article-' + m[1];
  // fallback: home
  return 'home';
}

function pageToPath(p, articleSlug) {
  if (p.startsWith('article-')) {
    const id = p.replace('article-', '');
    const slug = articleSlug || 'article';
    return `/Articles/${slug}/${id}/`;
  }
  return '/';
}

// ─── APP ─────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState(() => parsePathToPage(window.location.pathname));
  const articleSlugs = useRef({});
  const [highlightIds, setHighlightIds] = useState(null); // null = not yet loaded

  // Inject custom scripts from site settings
  useEffect(() => {
    getSettings().then(map => {
      if (map['default_article_image']) {
        FALLBACK_IMAGE = { url: map['default_article_image'], alt: 'Article image' };
      }
      // map is already { key: value } from the public endpoint
      function injectScripts(html, target) {
        if (!html?.trim()) return;
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        tpl.content.querySelectorAll('script').forEach(orig => {
          const s = document.createElement('script');
          Array.from(orig.attributes).forEach(a => s.setAttribute(a.name, a.value));
          if (!orig.src) s.textContent = orig.textContent;
          target.appendChild(s);
        });
        tpl.content.querySelectorAll(':not(script)').forEach(n => target.appendChild(n.cloneNode(true)));
      }
      injectScripts(map['custom_head_scripts'],   document.head);
      injectScripts(map['custom_body_scripts'],   document.body);
      injectScripts(map['custom_footer_scripts'], document.body);
    }).catch(() => {});
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);

  // Keep browser URL in sync
  useEffect(() => {
    const id = page.startsWith('article-') ? page.replace('article-', '') : null;
    const slug = id ? (articleSlugs.current[id] || 'article') : null;
    const path = pageToPath(page, slug);
    if (window.location.pathname !== path) {
      window.history.pushState({ page }, '', path);
    }
  }, [page]);

  // Handle browser back/forward
  useEffect(() => {
    const handler = (e) => {
      const p = e.state?.page || parsePathToPage(window.location.pathname);
      setPage(p);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const nav = (p, slug) => {
    if (p.startsWith('article-') && slug) {
      const id = p.replace('article-', '');
      articleSlugs.current[id] = slug;
    }
    setPage(p);
  };

  let content;
  if (page === 'home') content = <HomePage setPage={nav} onHighlightIds={setHighlightIds} />;
  else if (page === 'topStories') content = <CategoryPage category="topStories" title="Top Stories" setPage={nav} />;
  else if (page === 'internationalNews') content = <CategoryPage category="internationalNews" title="International News" setPage={nav} />;
  else if (page === 'nationalNews') content = <CategoryPage category="nationalNews" title="National News" setPage={nav} />;
  else if (page === 'pressReleases') content = <CategoryPage category="pressReleases" title="Press Releases" setPage={nav} />;
  else if (page === 'events') content = <EventsPage setPage={nav} />;
  else if (page === 'advertise') content = <AdvertisePage />;
  else if (page === 'archives') content = <ArchivesPage />;
  else if (page === 'contact') content = <ContactPage />;
  else if (page === 'subscribe') content = <SubscribePage />;
  else if (page === 'privacy') content = (
    <div className="wrap" style={{ maxWidth: 800, padding: '32px 24px 60px' }}>
      <h1 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 16 }}>Privacy Policy</h1>
      <div style={{ fontFamily: 'var(--f-body)', fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
        <p style={{ marginBottom: 20 }}>The Background Investigator is committed to protecting your privacy. This page outlines our policies regarding the collection, use, and disclosure of personal data when you use our website and newsletter services.</p>
        <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)', marginTop: 32, marginBottom: 12 }}>Information We Collect</h2>
        <p style={{ marginBottom: 20 }}>We collect information you voluntarily provide, such as your email address when subscribing to our newsletter or contacting us through our contact form.</p>
        <h2 style={{ fontFamily: 'var(--f-display)', fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)', marginTop: 32, marginBottom: 12 }}>Contact</h2>
        <p>For privacy-related inquiries, contact us at 866-909-6678.</p>
      </div>
    </div>
  );
  else if (page.startsWith('article-')) {
    const id = parseInt(page.replace('article-', ''));
    content = <ArticlePage articleId={id} setPage={nav} onSlug={slug => {
      articleSlugs.current[id] = slug;
      const path = `/Articles/${slug}/${id}/`;
      if (window.location.pathname !== path) window.history.replaceState({ page }, '', path);
    }} />;
  }
  else content = <HomePage setPage={nav} onHighlightIds={setHighlightIds} />;

  return (
    <div style={{ minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700&family=Source+Serif+4:ital,wght@0,400;0,600&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background: var(--color-bg); }
        ::selection { background: #c0392b; color: #fff; }
        img { max-width: 100%; height: auto; display: block; }
        input:focus, textarea:focus { border-color: #c0392b !important; }
        @keyframes imgspin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        :root {
          --f-display: 'Libre Baskerville', Georgia, serif;
          --f-body: 'Source Serif 4', Georgia, serif;
          --f-ui: 'Outfit', system-ui, sans-serif;

          --text-xs: 0.75rem;
          --text-sm: 0.875rem;
          --text-base: 1rem;
          --text-lg: 1.125rem;
          --text-xl: 1.25rem;
          --text-2xl: 1.5rem;
          --text-3xl: 2rem;
          --text-4xl: 2.5rem;

          --color-primary: #0d1b2a;
          --color-accent: #c0392b;
          --color-bg: #f9f8f6;
          --color-surface: #f3f2ef;
          --color-text-primary: #1a1a1a;
          --color-text-secondary: #6b7280;
          --color-border: #e5e5e0;
        }

        .wrap { max-width: 1280px; margin: 0 auto; padding: 0 24px; }

        .desktop-only { display: flex; }
        .mobile-only { display: none !important; }
        .sidebar-col { display: block; }

        @media (max-width: 1023px) {
          .sidebar-col { display: none !important; }
        }
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
          .hero-img-col { min-height: 200px !important; }
        }
      `}</style>

      <a href="#main-content" style={{
        position: 'absolute', top: -100, left: 16, zIndex: 9999,
        padding: '12px 24px', background: 'var(--color-primary)', color: '#fff',
        fontFamily: 'var(--f-ui)', fontSize: 'var(--text-sm)', fontWeight: 600,
        borderRadius: '0 0 8px 8px',
      }}>Skip to main content</a>

      <Header currentPage={page} setPage={nav} highlightIds={highlightIds} />
      <main id="main-content">{content}</main>
      <Footer setPage={nav} />
    </div>
  );
}
