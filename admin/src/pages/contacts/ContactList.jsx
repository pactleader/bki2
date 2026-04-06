import { useState, useEffect } from 'react';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Card, Badge, Table, TR, TD } from '../../components/PageHeader.jsx';

export default function ContactList() {
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { load(); }, [filter]);

  function load() {
    const params = filter !== '' ? { is_read: filter } : {};
    api.listContacts(params).then(res => setContacts(res.data)).catch(() => toast('Load failed', 'error'));
  }

  async function expand(c) {
    if (expanded?.id === c.id) { setExpanded(null); return; }
    try {
      const full = await api.getContact(c.id);
      setContacts(list => list.map(x => x.id === c.id ? { ...x, is_read: 1 } : x));
      setExpanded(full);
    } catch { toast('Failed to load message', 'error'); }
  }

  async function handleDelete(c) {
    try {
      await api.deleteContact(c.id);
      setContacts(list => list.filter(x => x.id !== c.id));
      if (expanded?.id === c.id) setExpanded(null);
      toast('Deleted');
    } catch (err) {
      toast(err.message, 'error');
    } finally { setDeleting(null); }
  }

  return (
    <div>
      <PageHeader title="Contact Submissions" />
      <Card style={{ marginBottom: 16, padding: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['', 'All'], ['0', 'Unread'], ['1', 'Read']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)',
              background: filter === val ? 'var(--primary)' : '#fff',
              color: filter === val ? '#fff' : 'var(--text)', cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 0 }}>
        <Table headers={['Name', 'Email', 'Subject', 'Date', 'Status', '']}>
          {contacts.map(c => (
            <>
              <TR key={c.id}>
                <TD style={{ fontWeight: c.is_read ? 400 : 700 }}>{c.name}</TD>
                <TD style={{ color: 'var(--text-muted)' }}>{c.email}</TD>
                <TD>{c.subject || <em style={{ color: 'var(--text-muted)' }}>No subject</em>}</TD>
                <TD style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(c.submitted_at).toLocaleDateString()}</TD>
                <TD><Badge color={c.is_read ? '#888' : 'var(--accent)'}>{c.is_read ? 'Read' : 'Unread'}</Badge></TD>
                <TD>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => expand(c)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer' }}>
                      {expanded?.id === c.id ? 'Collapse' : 'View'}
                    </button>
                    <button onClick={() => setDeleting(c)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                  </div>
                </TD>
              </TR>
              {expanded?.id === c.id && (
                <tr key={`exp-${c.id}`}>
                  <td colSpan={6} style={{ padding: '16px 20px', background: '#f8f9fa', borderBottom: '1px solid var(--border)' }}>
                    <strong style={{ display: 'block', marginBottom: 8 }}>From: {expanded.name} &lt;{expanded.email}&gt;</strong>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>{expanded.message}</p>
                    <div style={{ marginTop: 12 }}>
                      <a href={`mailto:${expanded.email}?subject=Re: ${expanded.subject || 'Your message'}`}
                        style={{ fontSize: 12, color: 'var(--accent)' }}>Reply via Email →</a>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
          {contacts.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No messages.</td></tr>}
        </Table>
      </Card>

      {deleting && (
        <ConfirmModal
          title="Delete Message"
          message={`Delete message from "${deleting.name}"?`}
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
