import { useState, useEffect } from 'react';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import PageHeader, { Btn, Card, Field, Input, Textarea } from '../../components/PageHeader.jsx';

const FIELDS = [
  { key: 'site_name',        label: 'Site Name',          type: 'string' },
  { key: 'site_tagline',     label: 'Tagline',            type: 'string' },
  { key: 'site_url',         label: 'Site URL',           type: 'string' },
  { key: 'phone',            label: 'Phone',              type: 'string' },
  { key: 'address',          label: 'Address',            type: 'string' },
  { key: 'og_image_default', label: 'Default OG Image URL',type: 'string' },
  { key: 'robots_meta',      label: 'Robots Meta',        type: 'string', hint: 'e.g. noindex, nofollow OR index, follow' },
];

export default function SiteSettings() {
  const toast = useToast();
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listSettings()
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.setting_key] = r.setting_value; });
        setValues(map);
      })
      .catch(() => toast('Load failed', 'error'));
  }, []);

  function set(k, v) { setValues(prev => ({ ...prev, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const items = FIELDS.map(f => ({ key: f.key, value: values[f.key] || '', type: f.type }));
      await api.saveSettings(items);
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader title="Site Settings" />
      <Card style={{ maxWidth: 600 }}>
        <form onSubmit={save}>
          {FIELDS.map(f => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              <Input value={values[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
            </Field>
          ))}
          <div style={{ marginTop: 8 }}>
            <Btn type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
