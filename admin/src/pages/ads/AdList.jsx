import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Badge } from '../../components/PageHeader.jsx';

const POSITION_LABEL = {
  'leaderboard-top': 'Leaderboard Top',
  'leaderboard-mid': 'Leaderboard Mid',
  'sidebar-1':       'Sidebar Slot 1 (top)',
  'sidebar-2':       'Sidebar Slot 2',
  'sidebar-3':       'Sidebar Slot 3',
  'sidebar-4':       'Sidebar Slot 4',
  'sidebar-5':       'Sidebar Slot 5 (bottom)',
  'in-feed':         'In-Feed',
  'footer-banner':   'Footer Banner',
};

const POSITION_DESC = {
  'leaderboard-top': 'Full-width banner below the navigation bar',
  'leaderboard-mid': 'Full-width banner in the middle of the page',
  'sidebar-1':       'Top of the right sidebar on all pages',
  'sidebar-2':       'Second slot in the right sidebar',
  'sidebar-3':       'Third slot in the right sidebar',
  'sidebar-4':       'Fourth slot in the right sidebar',
  'sidebar-5':       'Bottom of the right sidebar',
  'in-feed':         'Injected between article sections in the content feed',
  'footer-banner':   'Full-width banner above the footer',
};

const SIDEBAR_SLOTS = ['sidebar-1', 'sidebar-2', 'sidebar-3', 'sidebar-4', 'sidebar-5'];

const fmtDate = v => v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

function scheduleStatus(ad) {
  const now = new Date();
  if (ad.expires_at && new Date(ad.expires_at) < now) return 'expired';
  if (ad.starts_at && new Date(ad.starts_at) > now) return 'scheduled';
  return 'active';
}

export default function AdList() {
  const toast = useToast();
  const [ads, setAds] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [view, setView] = useState('visual'); // 'visual' | 'list'

  useEffect(() => { api.listAds().then(setAds).catch(() => toast('Load failed', 'error')); }, []);

  async function handleToggle(ad) {
    try {
      await api.toggleAd(ad.id);
      setAds(list => list.map(x => x.id === ad.id ? { ...x, is_active: x.is_active ? 0 : 1 } : x));
    } catch (err) { toast(err.message, 'error'); }
  }

  async function handleDelete(ad) {
    try {
      await api.deleteAd(ad.id);
      setAds(list => list.filter(x => x.id !== ad.id));
      toast('Deleted');
    } catch (err) { toast(err.message, 'error'); }
    finally { setDeleting(null); }
  }

  async function moveSidebarAd(ad, direction) {
    const slotAds = ads.filter(a => a.position_slug === ad.position_slug).sort((a, b) => a.display_order - b.display_order);
    const idx = slotAds.findIndex(a => a.id === ad.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= slotAds.length) return;
    const a = slotAds[idx], b = slotAds[swapIdx];
    try {
      await Promise.all([api.updateAd(a.id, { ...a, display_order: b.display_order }), api.updateAd(b.id, { ...b, display_order: a.display_order })]);
      setAds(list => list.map(x => x.id === a.id ? { ...x, display_order: b.display_order } : x.id === b.id ? { ...x, display_order: a.display_order } : x));
    } catch (err) { toast(err.message, 'error'); }
  }

  function getSlotAds(slug) {
    return ads.filter(a => a.position_slug === slug).sort((a, b) => a.display_order - b.display_order);
  }

  const leaderboardTop = getSlotAds('leaderboard-top');
  const leaderboardMid = getSlotAds('leaderboard-mid');
  const inFeed         = getSlotAds('in-feed');
  const footerBanner   = getSlotAds('footer-banner');

  return (
    <div>
      <PageHeader
        title="Ad Management"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              <button onClick={() => setView('visual')} style={{ padding: '6px 14px', fontSize: 12, border: 'none', cursor: 'pointer', background: view === 'visual' ? 'var(--primary)' : '#fff', color: view === 'visual' ? '#fff' : 'var(--text)' }}>Visual</button>
              <button onClick={() => setView('list')} style={{ padding: '6px 14px', fontSize: 12, border: 'none', cursor: 'pointer', background: view === 'list' ? 'var(--primary)' : '#fff', color: view === 'list' ? '#fff' : 'var(--text)' }}>List</button>
            </div>
            <Link to="/admin/ads/new"><Btn variant="accent">+ New Ad</Btn></Link>
          </div>
        }
      />

      {view === 'visual' ? (
        <VisualView
          ads={ads}
          leaderboardTop={leaderboardTop}
          leaderboardMid={leaderboardMid}
          inFeed={inFeed}
          footerBanner={footerBanner}
          getSlotAds={getSlotAds}
          handleToggle={handleToggle}
          setDeleting={setDeleting}
          moveSidebarAd={moveSidebarAd}
        />
      ) : (
        <ListView
          ads={ads}
          getSlotAds={getSlotAds}
          handleToggle={handleToggle}
          setDeleting={setDeleting}
          moveSidebarAd={moveSidebarAd}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Delete Ad"
          message={`Delete "${deleting.name}"?`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

// ── Ad Card ───────────────────────────────────────────────────────────────────
function AdCard({ ad, onToggle, onDelete, onMoveUp, onMoveDown, compact = false }) {
  const status = scheduleStatus(ad);
  const inactive = !ad.is_active || status === 'expired';

  return (
    <div style={{
      border: `1px solid ${inactive ? '#e5e7eb' : status === 'scheduled' ? '#fde68a' : '#d1fae5'}`,
      borderRadius: 8,
      background: inactive ? '#fafafa' : status === 'scheduled' ? '#fffbeb' : '#f0fdf4',
      overflow: 'hidden',
      opacity: inactive ? 0.75 : 1,
    }}>
      {/* Ad image */}
      {ad.image_url ? (
        <div style={{ position: 'relative', background: '#111', minHeight: compact ? 60 : 80 }}>
          <img
            src={ad.image_url}
            alt={ad.name}
            style={{ width: '100%', height: compact ? 60 : 80, objectFit: 'cover', display: 'block' }}
            onError={e => e.target.style.display = 'none'}
          />
          {/* Status pill overlay */}
          <div style={{ position: 'absolute', top: 6, right: 6 }}>
            {status === 'expired' && <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>EXPIRED</span>}
            {status === 'scheduled' && <span style={{ background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>SCHEDULED</span>}
            {status === 'active' && ad.is_active && <span style={{ background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>ACTIVE</span>}
            {!ad.is_active && <span style={{ background: '#6b7280', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>INACTIVE</span>}
          </div>
        </div>
      ) : (
        <div style={{ height: compact ? 50 : 70, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>No image</span>
        </div>
      )}

      {/* Info row */}
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ad.name}</div>
          {ad.expires_at && status !== 'expired' && (
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>Expires {fmtDate(ad.expires_at)}</div>
          )}
          {ad.starts_at && status === 'scheduled' && (
            <div style={{ fontSize: 10, color: '#d97706', marginTop: 1 }}>Starts {fmtDate(ad.starts_at)}</div>
          )}
        </div>

        {/* Reorder */}
        {(onMoveUp || onMoveDown) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={onMoveUp} disabled={!onMoveUp} style={{ width: 20, height: 20, border: '1px solid var(--border)', borderRadius: 3, background: onMoveUp ? '#fff' : '#f3f4f6', color: onMoveUp ? 'var(--primary)' : '#d1d5db', cursor: onMoveUp ? 'pointer' : 'default', fontSize: 11, lineHeight: 1, padding: 0 }}>↑</button>
            <button onClick={onMoveDown} disabled={!onMoveDown} style={{ width: 20, height: 20, border: '1px solid var(--border)', borderRadius: 3, background: onMoveDown ? '#fff' : '#f3f4f6', color: onMoveDown ? 'var(--primary)' : '#d1d5db', cursor: onMoveDown ? 'pointer' : 'default', fontSize: 11, lineHeight: 1, padding: 0 }}>↓</button>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!ad.is_active} onChange={() => onToggle(ad)} style={{ width: 13, height: 13 }} />
            <span style={{ fontSize: 10, color: '#6b7280' }}>{ad.is_active ? 'On' : 'Off'}</span>
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link to={`/admin/ads/${ad.id}/edit`} style={{ fontSize: 11, color: 'var(--primary)' }}>Edit</Link>
            <button onClick={() => onDelete(ad)} style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Del</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty slot placeholder ────────────────────────────────────────────────────
function EmptySlot({ label }) {
  return (
    <div style={{ border: '2px dashed #e5e7eb', borderRadius: 8, padding: '14px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#9ca3af' }}>No ads in {label}</div>
      <Link to="/admin/ads/new" style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'underline' }}>+ Add one</Link>
    </div>
  );
}

// ── Zone wrapper ──────────────────────────────────────────────────────────────
function Zone({ label, desc, color = '#6b7280', children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
        {desc && <span style={{ fontSize: 11, color: '#9ca3af' }}>— {desc}</span>}
      </div>
      {children}
    </div>
  );
}

// ── VISUAL VIEW ───────────────────────────────────────────────────────────────
function VisualView({ ads, leaderboardTop, leaderboardMid, inFeed, footerBanner, getSlotAds, handleToggle, setDeleting, moveSidebarAd }) {

  function SidebarAdCards({ slug }) {
    const slotAds = getSlotAds(slug);
    if (slotAds.length === 0) return <EmptySlot label={POSITION_LABEL[slug]} />;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {slotAds.map((ad, idx) => (
          <AdCard
            key={ad.id}
            ad={ad}
            compact
            onToggle={handleToggle}
            onDelete={setDeleting}
            onMoveUp={idx > 0 ? () => moveSidebarAd(ad, -1) : null}
            onMoveDown={idx < slotAds.length - 1 ? () => moveSidebarAd(ad, 1) : null}
          />
        ))}
      </div>
    );
  }

  function HorizontalAdCards({ slotAds, label }) {
    if (slotAds.length === 0) return <EmptySlot label={label} />;
    return (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {slotAds.map(ad => (
          <div key={ad.id} style={{ flex: '1 1 260px', maxWidth: 380 }}>
            <AdCard ad={ad} onToggle={handleToggle} onDelete={setDeleting} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Page layout diagram */}
      <Card style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Page Layout Preview</div>

        {/* Nav bar mock */}
        <div style={{ background: '#0d1b2a', borderRadius: 4, padding: '8px 16px', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>THE BACKGROUND INVESTIGATOR</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>navigation</span>
        </div>

        {/* Leaderboard Top */}
        <div style={{ border: '2px dashed #f59e0b', borderRadius: 4, padding: '6px 10px', marginBottom: 4, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>📢 Leaderboard Top</span>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>full width</span>
        </div>

        {/* Content + Sidebar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <div style={{ flex: 3 }}>
            {/* In-feed indicator */}
            <div style={{ background: '#f3f4f6', borderRadius: 4, padding: '6px 10px', marginBottom: 4, minHeight: 40, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>Article content area</span>
            </div>
            <div style={{ border: '2px dashed #818cf8', borderRadius: 4, padding: '4px 10px', marginBottom: 4, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase' }}>📢 In-Feed Ad</span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>between sections</span>
            </div>
            <div style={{ background: '#f3f4f6', borderRadius: 4, padding: '6px 10px', marginBottom: 4, minHeight: 30, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>More content…</span>
            </div>
            {/* Leaderboard Mid */}
            <div style={{ border: '2px dashed #f59e0b', borderRadius: 4, padding: '4px 10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>📢 Leaderboard Mid</span>
              <span style={{ fontSize: 10, color: '#9ca3af' }}>mid-page</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {['sidebar-1', 'sidebar-2', 'sidebar-3', 'sidebar-4', 'sidebar-5'].map(s => (
              <div key={s} style={{ border: '2px dashed #10b981', borderRadius: 4, padding: '4px 6px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>📢 {POSITION_LABEL[s]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer banner */}
        <div style={{ border: '2px dashed #ec4899', borderRadius: 4, padding: '6px 10px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#db2777', textTransform: 'uppercase' }}>📢 Footer Banner</span>
          <span style={{ fontSize: 10, color: '#9ca3af' }}>above footer</span>
        </div>
      </Card>

      {/* Actual ad slots */}

      {/* Leaderboard Top */}
      <Card style={{ marginBottom: 20 }}>
        <Zone label="Leaderboard Top" desc={POSITION_DESC['leaderboard-top']} color="#f59e0b">
          <HorizontalAdCards slotAds={leaderboardTop} label="Leaderboard Top" />
        </Zone>
      </Card>

      {/* Content + Sidebar */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, alignItems: 'flex-start' }}>
        {/* Left: In-feed + Leaderboard Mid */}
        <div style={{ flex: 3, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <Zone label="In-Feed" desc={POSITION_DESC['in-feed']} color="#818cf8">
              <HorizontalAdCards slotAds={inFeed} label="In-Feed" />
            </Zone>
          </Card>
          <Card>
            <Zone label="Leaderboard Mid" desc={POSITION_DESC['leaderboard-mid']} color="#f59e0b">
              <HorizontalAdCards slotAds={leaderboardMid} label="Leaderboard Mid" />
            </Zone>
          </Card>
        </div>

        {/* Right: Sidebar slots */}
        <div style={{ flex: 1, minWidth: 200, maxWidth: 280 }}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#10b981' }} />
              Sidebar Slots
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {SIDEBAR_SLOTS.map(slug => (
                <div key={slug}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>{POSITION_LABEL[slug]}</div>
                  <SidebarAdCards slug={slug} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Footer Banner */}
      <Card style={{ marginBottom: 20 }}>
        <Zone label="Footer Banner" desc={POSITION_DESC['footer-banner']} color="#ec4899">
          <HorizontalAdCards slotAds={footerBanner} label="Footer Banner" />
        </Zone>
      </Card>
    </div>
  );
}

// ── LIST VIEW (original table layout) ────────────────────────────────────────
function ListView({ ads, getSlotAds, handleToggle, setDeleting, moveSidebarAd }) {
  const otherAds = ads.filter(a => !SIDEBAR_SLOTS.includes(a.position_slug));

  return (
    <div>
      {SIDEBAR_SLOTS.map(slot => {
        const slotAds = getSlotAds(slot);
        if (slotAds.length === 0) return null;
        return (
          <div key={slot} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>{POSITION_LABEL[slot]}</div>
            <Card style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Preview','Name','Schedule','Active',''].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {slotAds.map((ad, idx) => {
                    const status = scheduleStatus(ad);
                    return (
                      <tr key={ad.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          {ad.image_url ? <img src={ad.image_url} alt={ad.name} style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display='none'} /> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No image</span>}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 500, fontSize: 13 }}>{ad.name}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {status === 'expired' ? <Badge color="#ef4444">Expired {fmtDate(ad.expires_at)}</Badge>
                            : status === 'scheduled' ? <Badge color="#f59e0b">Starts {fmtDate(ad.starts_at)}</Badge>
                            : ad.expires_at ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expires {fmtDate(ad.expires_at)}</span>
                            : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!ad.is_active} onChange={() => handleToggle(ad)} style={{ width: 16, height: 16 }} />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ad.is_active ? 'Active' : 'Inactive'}</span>
                          </label>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button onClick={() => moveSidebarAd(ad, -1)} disabled={idx === 0} style={{ background: idx === 0 ? '#eee' : 'var(--primary)', color: idx === 0 ? '#aaa' : '#fff', border: 'none', borderRadius: 3, width: 24, height: 24, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 13 }}>↑</button>
                            <button onClick={() => moveSidebarAd(ad, 1)} disabled={idx === slotAds.length - 1} style={{ background: idx === slotAds.length-1 ? '#eee' : 'var(--primary)', color: idx === slotAds.length-1 ? '#aaa' : '#fff', border: 'none', borderRadius: 3, width: 24, height: 24, cursor: idx === slotAds.length-1 ? 'default' : 'pointer', fontSize: 13 }}>↓</button>
                            <Link to={`/admin/ads/${ad.id}/edit`} style={{ color: 'var(--primary)', fontSize: 12 }}>Edit</Link>
                            <button onClick={() => setDeleting(ad)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        );
      })}

      {otherAds.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Other Positions</div>
          <Card style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Preview','Name','Position','Schedule','Active',''].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
              <tbody>
                {otherAds.map(ad => {
                  const status = scheduleStatus(ad);
                  return (
                    <tr key={ad.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        {ad.image_url ? <img src={ad.image_url} alt={ad.name} style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display='none'} /> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No image</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, fontSize: 13 }}>{ad.name}</td>
                      <td style={{ padding: '10px 14px' }}><Badge color="var(--primary)">{POSITION_LABEL[ad.position_slug] || ad.position_slug}</Badge></td>
                      <td style={{ padding: '10px 14px' }}>
                        {status === 'expired' ? <Badge color="#ef4444">Expired {fmtDate(ad.expires_at)}</Badge>
                          : status === 'scheduled' ? <Badge color="#f59e0b">Starts {fmtDate(ad.starts_at)}</Badge>
                          : ad.expires_at ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expires {fmtDate(ad.expires_at)}</span>
                          : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!ad.is_active} onChange={() => handleToggle(ad)} style={{ width: 16, height: 16 }} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ad.is_active ? 'Active' : 'Inactive'}</span>
                        </label>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link to={`/admin/ads/${ad.id}/edit`} style={{ color: 'var(--primary)', fontSize: 12 }}>Edit</Link>
                          <button onClick={() => setDeleting(ad)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {ads.length === 0 && (
        <Card><p style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No ads yet.</p></Card>
      )}
    </div>
  );
}
