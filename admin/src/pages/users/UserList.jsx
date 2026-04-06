import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Badge, Table, TR, TD } from '../../components/PageHeader.jsx';

export default function UserList() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [deactivating, setDeactivating] = useState(null);

  useEffect(() => { api.listUsers().then(setUsers).catch(() => toast('Failed to load', 'error')); }, []);

  async function handleDeactivate(u) {
    try {
      await api.deleteUser(u.id);
      setUsers(list => list.map(x => x.id === u.id ? { ...x, is_active: 0 } : x));
      toast('User deactivated');
    } catch (err) {
      toast(err.message, 'error');
    } finally { setDeactivating(null); }
  }

  return (
    <div>
      <PageHeader title="Users" action={<Link to="/admin/users/new"><Btn variant="accent">+ New User</Btn></Link>} />
      <Card style={{ padding: 0 }}>
        <Table headers={['Name', 'Email', 'Role', 'Status', 'Created', '']}>
          {users.map(u => (
            <TR key={u.id}>
              <TD style={{ fontWeight: 500 }}>{u.display_name}</TD>
              <TD style={{ color: 'var(--text-muted)' }}>{u.email}</TD>
              <TD><Badge color={u.role === 'admin' ? 'var(--accent)' : 'var(--primary)'}>{u.role}</Badge></TD>
              <TD><Badge color={u.is_active ? 'var(--success)' : '#888'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></TD>
              <TD style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</TD>
              <TD>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link to={`/admin/users/${u.id}/edit`} style={{ color: 'var(--primary)', fontSize: 12 }}>Edit</Link>
                  {u.is_active ? (
                    <button onClick={() => setDeactivating(u)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Deactivate</button>
                  ) : null}
                </div>
              </TD>
            </TR>
          ))}
          {users.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No users.</td></tr>}
        </Table>
      </Card>
      {deactivating && (
        <ConfirmModal
          title="Deactivate User"
          message={`Deactivate "${deactivating.display_name}"? They will no longer be able to log in.`}
          onConfirm={() => handleDeactivate(deactivating)}
          onCancel={() => setDeactivating(null)}
        />
      )}
    </div>
  );
}
