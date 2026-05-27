import { useState, useEffect } from 'react';
import AsyncSelect from 'react-select/async';
import * as api from '../../api.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import PageHeader, { Btn, Card, Field, Select, Badge } from '../../components/PageHeader.jsx';

// react-select custom styles to match the admin UI
const selectStyles = {
  control: (b, s) => ({
    ...b,
    borderColor: s.isFocused ? '#c0392b' : 'var(--border, #ddd)',
    boxShadow: s.isFocused ? '0 0 0 1px #c0392b' : 'none',
    borderRadius: 6,
    fontSize: 13,
    minHeight: 38,
    '&:hover': { borderColor: '#c0392b' },
  }),
  multiValue: (b) => ({ ...b, background: '#fdecea', borderRadius: 3 }),
  multiValueLabel: (b) => ({ ...b, color: '#c0392b', fontSize: 12, fontWeight: 600 }),
  multiValueRemove: (b) => ({ ...b, color: '#c0392b', '&:hover': { background: '#c0392b', color: '#fff' } }),
  menu: (b) => ({ ...b, fontSize: 13, zIndex: 99 }),
  option: (b, s) => ({ ...b, background: s.isSelected ? '#c0392b' : s.isFocused ? '#fdecea' : '#fff', color: s.isSelected ? '#fff' : '#1a1a1a' }),
};

async function searchArticles(inputValue) {
  try {
    const res = await api.listArticles({ search: inputValue, limit: 20, status: 'published' });
    return (res.data || []).map(a => ({ value: a.id, label: `[${a.id}] ${a.title}` }));
  } catch { return []; }
}

export default function HomepageConfig() {
  const toast = useToast();
  const [sections, setSections] = useState([]);
  const [categories, setCategories] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newCatId, setNewCatId] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  // Settings: most_read — stored as array of {value, label} for react-select
  const [mostRead, setMostRead] = useState([]);   // [{value: id, label: title}, ...]
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [s, c, st] = await Promise.all([
        api.listHomepageSections(),
        api.listCategories(),
        api.listSettings(),
      ]);
      setSections(s);
      setCategories(c);

      // Resolve saved IDs into {value, label} options for react-select
      const mrSetting = st.find(x => x.setting_key === 'most_read_article_ids');
      const mrIds = safeParseIds(mrSetting?.setting_value);

      const resolved = {};
      if (mrIds.length > 0) {
        await Promise.all(mrIds.map(async id => {
          try {
            const a = await api.getArticle(id);
            resolved[id] = `[${id}] ${a.title}`;
          } catch { resolved[id] = `[${id}] (article ${id})`; }
        }));
      }

      setMostRead(mrIds.map(id => ({ value: id, label: resolved[id] || `[${id}]` })));
    } catch { toast('Load failed', 'error'); }
  }

  function safeParseIds(str) {
    try {
      const parsed = JSON.parse(str || '[]');
      return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
    } catch { return []; }
  }

  async function addSection() {
    if (!newCatId) { toast('Select a category', 'error'); return; }
    setSaving(true);
    try {
      await api.createHomepageSection({ category_id: newCatId, display_order: sections.length, article_count: 4, layout: 'band' });
      toast('Section added');
      setAdding(false);
      setNewCatId('');
      load();
    } catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  async function updateSection(id, field, value) {
    try {
      const sec = sections.find(s => s.id === id);
      await api.updateHomepageSection(id, { ...sec, [field]: value });
      setSections(list => list.map(s => s.id === id ? { ...s, [field]: value } : s));
    } catch (err) { toast(err.message, 'error'); }
  }

  async function deleteSection(sec) {
    try {
      await api.deleteHomepageSection(sec.id);
      setSections(list => list.filter(s => s.id !== sec.id));
      toast('Section removed');
    } catch (err) { toast(err.message, 'error'); }
    finally { setDeleting(null); }
  }

  async function saveSettings() {
    setSettingsSaving(true);
    try {
      await api.saveSettings([
        { key: 'most_read_article_ids', value: JSON.stringify(mostRead.map(o => o.value)), type: 'json' },
      ]);
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally { setSettingsSaving(false); }
  }

  const usedCatIds = sections.map(s => s.category_id);
  const availableCats = categories.filter(c => !usedCatIds.includes(c.id));

  return (
    <div>
      <PageHeader title="Homepage Configuration" />

      {/* Sections */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Category Sections</h3>
          <Btn variant="accent" onClick={() => setAdding(true)} disabled={availableCats.length === 0}>+ Add Section</Btn>
        </div>

        {sections.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No sections configured. Add a category to show on the homepage.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sections.map((sec, idx) => (
              <div key={sec.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                border: '1px solid var(--border)', borderRadius: 6, background: '#fafbfc',
              }}>
                <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 2, background: sec.color_hex, flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{sec.cat_name}</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Articles:</label>
                  <select value={sec.article_count} onChange={e => updateSection(sec.id, 'article_count', parseInt(e.target.value))}
                    style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                    {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Layout:</label>
                  <select value={sec.layout} onChange={e => updateSection(sec.id, 'layout', e.target.value)}
                    style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}>
                    <option value="grid">Grid</option>
                    <option value="featured">Featured</option>
                  </select>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!sec.is_active} onChange={e => updateSection(sec.id, 'is_active', e.target.checked ? 1 : 0)} />
                  Active
                </label>

                <div style={{ display: 'flex', gap: 6 }}>
                  {idx > 0 && (
                    <button onClick={async () => {
                      const reordered = [...sections];
                      [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
                      const updated = reordered.map((s, i) => ({ ...s, display_order: i }));
                      setSections(updated);
                      await api.reorderHomepage(updated.map(s => ({ id: s.id, display_order: s.display_order })));
                    }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: 12 }}>↑</button>
                  )}
                  {idx < sections.length - 1 && (
                    <button onClick={async () => {
                      const reordered = [...sections];
                      [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
                      const updated = reordered.map((s, i) => ({ ...s, display_order: i }));
                      setSections(updated);
                      await api.reorderHomepage(updated.map(s => ({ id: s.id, display_order: s.display_order })));
                    }} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: 12 }}>↓</button>
                  )}
                  <button onClick={() => setDeleting(sec)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {adding && (
          <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <select value={newCatId} onChange={e => setNewCatId(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff' }}>
              <option value="">Select category…</option>
              {availableCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Btn variant="accent" onClick={addSection} disabled={saving}>{saving ? 'Adding…' : 'Add'}</Btn>
            <Btn variant="outline" onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        )}
      </Card>

      {/* Most Read */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Sidebar</h3>
        <Field label="Most Read Articles" hint="Search and select up to 7 articles to show in the sidebar Most Read list">
          <AsyncSelect
            isMulti
            cacheOptions
            defaultOptions
            loadOptions={searchArticles}
            value={mostRead}
            onChange={setMostRead}
            placeholder="Search articles…"
            styles={selectStyles}
            noOptionsMessage={({ inputValue }) => inputValue ? 'No articles found' : 'Type to search…'}
          />
        </Field>
        <Btn variant="accent" onClick={saveSettings} disabled={settingsSaving}>{settingsSaving ? 'Saving…' : 'Save Settings'}</Btn>
      </Card>

      {deleting && (
        <ConfirmModal
          title="Remove Section"
          message={`Remove "${deleting.cat_name}" from the homepage?`}
          onConfirm={() => deleteSection(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
