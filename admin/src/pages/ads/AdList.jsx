import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Badge, Table, TR, TD } from '../../components/PageHeader.jsx';

const POSITIONS = {
  'leaderboard-top':   'Leaderboard Top',
  'leaderboard-mid':   'Leaderboard Mid',
  'sidebar-1':         'Sidebar 1',
  'sidebar-2':         'Sidebar 2',
  'in-feed':           'In-Feed',
  'footer-banner':     'Footer Banner',
};

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

  return (
    <div>
      <PageHeader title="Ad Management" action={<Link to="/admin/ads/new"><Btn variant="accent">+ New Ad</Btn></Link>} />
      <Card style={{ padding: 0 }}>
        <Table headers={['Preview', 'Name', 'Position', 'Active', '']}>
          {ads.map(ad => (
            <TR key={ad.id}>
              <TD>
                {ad.image_url
                  ? <img src={ad.image_url} alt={ad.name} style={{ width: 80, height: 44, objectFit: 'cover', borderRadius: 4 }} onError={e => e.target.style.display = 'none'} />
                  : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No image</span>}
              </TD>
              <TD style={{ fontWeight: 500 }}>{ad.name}</TD>
              <TD><Badge color="var(--primary)">{POSITIONS[ad.position_slug] || ad.position_slug}</Badge></TD>
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
          {ads.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No ads yet.</td></tr>}
        </Table>
      </Card>
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
