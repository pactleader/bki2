import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Badge, Table, TR, TD } from '../../components/PageHeader.jsx';

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

const SIDEBAR_SLOTS = ['sidebar-1', 'sidebar-2', 'sidebar-3', 'sidebar-4', 'sidebar-5'];

export default function AdList() {
  const toast = useToast();
  const [ads, setAds] = useState([]);
  const [deleting, setDeleting] = useState(null);

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

  // Move a sidebar ad up or down within its slot group
  async function moveSidebarAd(ad, direction) {
    const slotAds = ads
      .filter(a => a.position_slug === ad.position_slug)
      .sort((a, b) => a.display_order - b.display_order);
    const idx = slotAds.findIndex(a => a.id === ad.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= slotAds.length) return;

    const a = slotAds[idx];
    const b = slotAds[swapIdx];
    const newOrderA = b.display_order;
    const newOrderB = a.display_order;

    try {
      await Promise.all([
        api.updateAd(a.id, { ...a, display_order: newOrderA }),
        api.updateAd(b.id, { ...b, display_order: newOrderB }),
      ]);
      setAds(list => list.map(x => {
        if (x.id === a.id) return { ...x, display_order: newOrderA };
        if (x.id === b.id) return { ...x, display_order: newOrderB };
        return x;
      }));
    } catch (err) { toast(err.message, 'error'); }
  }

  const sidebarAds = ads
    .filter(a => SIDEBAR_SLOTS.includes(a.position_slug))
    .sort((a, b) => {
      const slotA = SIDEBAR_SLOTS.indexOf(a.position_slug);
      const slotB = SIDEBAR_SLOTS.indexOf(b.position_slug);
      if (slotA !== slotB) return slotA - slotB;
      return a.display_order - b.display_order;
    });

  const otherAds = ads.filter(a => !SIDEBAR_SLOTS.includes(a.position_slug));

  const fmtDate = v => v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  function AdRow({ ad, showMoveButtons = false, slotAds = [] }) {
    const now = new Date();
    const expired = ad.expires_at && new Date(ad.expires_at) < now;
    const scheduled = ad.starts_at && new Date(ad.starts_at) > now;
    const idx = slotAds.findIndex(a => a.id === ad.id);

    return (
      <TR key={ad.id}>
        <TD>
          {ad.image_url
            ? <img src={ad.image_url} alt={ad.name} style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display = 'none'} />
            : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No image</span>}
        </TD>
        <TD style={{ fontWeight: 500 }}>{ad.name}</TD>
        <TD>
          {expired ? (
            <Badge color="#ef4444">Expired {fmtDate(ad.expires_at)}</Badge>
          ) : scheduled ? (
            <Badge color="#f59e0b">Starts {fmtDate(ad.starts_at)}</Badge>
          ) : ad.expires_at ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expires {fmtDate(ad.expires_at)}</span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
          )}
        </TD>
        <TD>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!ad.is_active} onChange={() => handleToggle(ad)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ad.is_active ? 'Active' : 'Inactive'}</span>
          </label>
        </TD>
        <TD>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {showMoveButtons && (
              <>
                <button onClick={() => moveSidebarAd(ad, -1)} disabled={idx === 0}
                  title="Move up"
                  style={{ background: idx === 0 ? '#eee' : 'var(--primary)', color: idx === 0 ? '#aaa' : '#fff', border: 'none', borderRadius: 3, width: 24, height: 24, cursor: idx === 0 ? 'default' : 'pointer', fontSize: 13, lineHeight: 1 }}>
                  ↑
                </button>
                <button onClick={() => moveSidebarAd(ad, 1)} disabled={idx === slotAds.length - 1}
                  title="Move down"
                  style={{ background: idx === slotAds.length - 1 ? '#eee' : 'var(--primary)', color: idx === slotAds.length - 1 ? '#aaa' : '#fff', border: 'none', borderRadius: 3, width: 24, height: 24, cursor: idx === slotAds.length - 1 ? 'default' : 'pointer', fontSize: 13, lineHeight: 1 }}>
                  ↓
                </button>
              </>
            )}
            <Link to={`/admin/ads/${ad.id}/edit`} style={{ color: 'var(--primary)', fontSize: 12 }}>Edit</Link>
            <button onClick={() => setDeleting(ad)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
          </div>
        </TD>
      </TR>
    );
  }

  return (
    <div>
      <PageHeader title="Ad Management" action={<Link to="/admin/ads/new"><Btn variant="accent">+ New Ad</Btn></Link>} />

      {/* Sidebar Ads — grouped by slot */}
      {SIDEBAR_SLOTS.map(slot => {
        const slotAds = sidebarAds.filter(a => a.position_slug === slot).sort((a, b) => a.display_order - b.display_order);
        if (slotAds.length === 0) return null;
        return (
          <div key={slot} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
              {POSITION_LABEL[slot]}
            </div>
            <Card style={{ padding: 0 }}>
              <Table headers={['Preview', 'Name', 'Schedule', 'Active', '']}>
                {slotAds.map(ad => <AdRow key={ad.id} ad={ad} showMoveButtons slotAds={slotAds} />)}
              </Table>
            </Card>
          </div>
        );
      })}

      {/* Other Ads */}
      {otherAds.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            Other Positions
          </div>
          <Card style={{ padding: 0 }}>
            <Table headers={['Preview', 'Name', 'Position', 'Schedule', 'Active', '']}>
              {otherAds.map(ad => (
                <TR key={ad.id}>
                  <TD>
                    {ad.image_url
                      ? <img src={ad.image_url} alt={ad.name} style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display = 'none'} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No image</span>}
                  </TD>
                  <TD style={{ fontWeight: 500 }}>{ad.name}</TD>
                  <TD><Badge color="var(--primary)">{POSITION_LABEL[ad.position_slug] || ad.position_slug}</Badge></TD>
                  <TD>
                    {(() => {
                      const now = new Date();
                      const expired = ad.expires_at && new Date(ad.expires_at) < now;
                      const scheduled = ad.starts_at && new Date(ad.starts_at) > now;
                      return expired ? <Badge color="#ef4444">Expired {fmtDate(ad.expires_at)}</Badge>
                        : scheduled ? <Badge color="#f59e0b">Starts {fmtDate(ad.starts_at)}</Badge>
                        : ad.expires_at ? <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Expires {fmtDate(ad.expires_at)}</span>
                        : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>;
                    })()}
                  </TD>
                  <TD>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!ad.is_active} onChange={() => handleToggle(ad)} style={{ width: 16, height: 16 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ad.is_active ? 'Active' : 'Inactive'}</span>
                    </label>
                  </TD>
                  <TD>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link to={`/admin/ads/${ad.id}/edit`} style={{ color: 'var(--primary)', fontSize: 12 }}>Edit</Link>
                      <button onClick={() => setDeleting(ad)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </TD>
                </TR>
              ))}
            </Table>
          </Card>
        </div>
      )}

      {ads.length === 0 && (
        <Card><p style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No ads yet.</p></Card>
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
