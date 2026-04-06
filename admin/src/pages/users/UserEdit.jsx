import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Input, Select } from '../../components/PageHeader.jsx';

export default function UserEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '', display_name: '', role: 'author', is_active: 1 });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      api.getUser(id).then(u => setForm({ ...u, password: '' })).catch(() => toast('Load failed', 'error')).finally(() => setLoading(false));
    }
  }, [id]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (isNew) { await api.createUser(payload); toast('User created'); }
      else { await api.updateUser(id, payload); toast('User updated'); }
      navigate('/admin/users');
    } catch (err) {
      toast(err.message, 'error');
    } finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div>
      <PageHeader
        title={isNew ? 'New User' : 'Edit User'}
        action={<Link to="/admin/users"><Btn variant="outline">← Back</Btn></Link>}
      />
      <Card style={{ maxWidth: 500 }}>
        <form onSubmit={save}>
          <Field label="Display Name"><Input required value={form.display_name} onChange={e => set('display_name', e.target.value)} /></Field>
          <Field label="Email"><Input type="email" required value={form.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label={isNew ? 'Password' : 'New Password'} hint={isNew ? '' : 'Leave blank to keep current password'}>
            <Input type="password" required={isNew} value={form.password} onChange={e => set('password', e.target.value)} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="author">Author</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          {!isNew && (
            <Field label="Status">
              <Select value={form.is_active} onChange={e => set('is_active', parseInt(e.target.value))}>
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </Select>
            </Field>
          )}
          <div style={{ marginTop: 8 }}>
            <Btn type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : 'Save User'}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
