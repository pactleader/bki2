import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Badge, Table, TR, TD } from '../../components/PageHeader.jsx';

export default function EventList() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { api.listEvents().then(setEvents).catch(() => toast('Load failed', 'error')); }, []);

  async function handleToggle(ev) {
    try {
      await api.toggleEvent(ev.id);
      setEvents(list => list.map(e => e.id === ev.id ? { ...e, is_active: e.is_active ? 0 : 1 } : e));
    } catch (err) { toast(err.message, 'error'); }
  }

  async function handleDelete(ev) {
    try {
      await api.deleteEvent(ev.id);
      setEvents(list => list.filter(e => e.id !== ev.id));
      toast('Deleted');
    } catch (err) { toast(err.message, 'error'); }
    finally { setDeleting(null); }
  }

  return (
    <div>
      <PageHeader title="Events" action={<Link to="/admin/events/new"><Btn variant="accent">+ New Event</Btn></Link>} />
      <Card style={{ padding: 0 }}>
        <Table headers={['Title', 'Date', 'Location', 'Active', '']}>
          {events.map(ev => (
            <TR key={ev.id}>
              <TD style={{ fontWeight: 500 }}>{ev.title}</TD>
              <TD style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ev.event_date}</TD>
              <TD style={{ color: 'var(--text-muted)' }}>{ev.location}</TD>
              <TD>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!ev.is_active} onChange={() => handleToggle(ev)} style={{ width: 15, height: 15 }} />
                </label>
              </TD>
              <TD>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link to={`/admin/events/${ev.id}/edit`} style={{ color: 'var(--primary)', fontSize: 12 }}>Edit</Link>
                  <button onClick={() => setDeleting(ev)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                </div>
              </TD>
            </TR>
          ))}
          {events.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No events.</td></tr>}
        </Table>
      </Card>
      {deleting && (
        <ConfirmModal
          title="Delete Event"
          message={`Delete "${deleting.title}"?`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
